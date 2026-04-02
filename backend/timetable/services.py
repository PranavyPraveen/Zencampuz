from django.db import transaction
from django.db.models import Count, Q
from academics.models import CourseSection, FacultyAvailability, FacultyPreference
from campus.models import Room
from timetable.models import (
    TimetableSlot, ClassSession, FacultyAssignment, RoomAssignment
)


class TimetableScheduler:
    MAX_CONSECUTIVE_HOURS = 2   # No faculty can teach more than 2 back-to-back slots
    MAX_HOURS_PER_DAY = 4       # No faculty can teach more than 4 slots in a single day

    def __init__(self, plan):
        self.plan = plan
        self.tenant = plan.tenant
        self.section = plan.section
        self.semester = plan.semester

        self.existing_sessions = ClassSession.objects.filter(
            timetable_slot__plan=self.plan, is_active=True
        ).select_related('timetable_slot')

        self.occupied_slots_for_section = set(s.timetable_slot_id for s in self.existing_sessions)

        # Per-session tracking: {user_id: {day_code: [list of slot order/time]}}
        self._faculty_day_slots = {}   # tracks slot order per day per faculty

    # ─── Room helpers ────────────────────────────────────────────────────────

    def get_candidate_rooms(self, course_type, required_capacity):
        """
        Returns best rooms for the given course type.
        PRACTICAL: return ALL active labs regardless of capacity — labs use split batches.
                   NEVER fall back to non-lab rooms (would fail RoomAssignment.clean).
        THEORY:    return classrooms/seminar halls that fit the full section. Fall back
                   to any non-lab room, then any room if still empty.
        """
        all_rooms = Room.objects.filter(tenant=self.tenant, status='active')

        if course_type == 'practical':
            # Labs only — no capacity filter (half-batch model: labs are shared in batches)
            return list(all_rooms.filter(room_type__type_code='lab').order_by('-capacity'))

        # Theory / tutorial
        theory_rooms = list(
            all_rooms.exclude(room_type__type_code='lab')
            .filter(capacity__gte=required_capacity)
            .order_by('capacity')
        )
        if theory_rooms:
            return theory_rooms
        # Fallback: any non-lab room (still better than cramming into a lab)
        fallback = list(all_rooms.exclude(room_type__type_code='lab').order_by('-capacity'))
        return fallback

    def is_room_free(self, room_id, slot):
        return not RoomAssignment.objects.filter(
            room_id=room_id,
            class_session__is_active=True,
            class_session__timetable_slot__day=slot.day,
            class_session__timetable_slot__time_slot=slot.time_slot,
            class_session__timetable_slot__plan__status__in=['draft', 'published']
        ).exists()

    def is_faculty_free(self, user_id, slot):
        return not FacultyAssignment.objects.filter(
            faculty_id=user_id,
            class_session__is_active=True,
            class_session__timetable_slot__day=slot.day,
            class_session__timetable_slot__time_slot=slot.time_slot,
            class_session__timetable_slot__plan__status__in=['draft', 'published']
        ).exists()

    # ─── Consecutive hours constraint ────────────────────────────────────────

    def _add_faculty_slot(self, user_id, slot):
        """Record that user_id is now teaching at this slot."""
        uid = str(user_id)
        day = slot.day.day
        order = slot.time_slot.order if hasattr(slot.time_slot, 'order') else slot.time_slot.start_time.hour * 60 + slot.time_slot.start_time.minute
        if uid not in self._faculty_day_slots:
            self._faculty_day_slots[uid] = {}
        self._faculty_day_slots[uid].setdefault(day, []).append(order)
        self._faculty_day_slots[uid][day].sort()

    def _would_be_consecutive(self, user_id, slot):
        """
        Returns True if placing user_id at slot would create >MAX_CONSECUTIVE_HOURS
        consecutive teaching periods for that faculty on that day.
        """
        uid = str(user_id)
        day = slot.day.day
        order = slot.time_slot.order if hasattr(slot.time_slot, 'order') else slot.time_slot.start_time.hour * 60 + slot.time_slot.start_time.minute

        existing = self._faculty_day_slots.get(uid, {}).get(day, [])
        if not existing:
            return False

        # Simulate adding this slot and count max consecutive run
        all_orders = sorted(existing + [order])
        max_run = 1
        current_run = 1
        for i in range(1, len(all_orders)):
            # Treat as consecutive if difference is 1 (period order) or ≤ 70 minutes
            diff = all_orders[i] - all_orders[i-1]
            CONSEC_THRESHOLD = 2 if max(all_orders) > 100 else 1  # adaptive
            if diff <= CONSEC_THRESHOLD:
                current_run += 1
                max_run = max(max_run, current_run)
            else:
                current_run = 1
        return max_run > self.MAX_CONSECUTIVE_HOURS

    def _faculty_day_count(self, user_id, day_code):
        uid = str(user_id)
        return len(self._faculty_day_slots.get(uid, {}).get(day_code, []))

    # ─── Scoring ─────────────────────────────────────────────────────────────

    def score_slot(self, slot, fac_profile, user_id):
        """Higher score = better slot for this faculty, using all FacultyPreference fields."""
        score = 0
        if not fac_profile:
            return score

        # Availability match (+10)
        avail = FacultyAvailability.objects.filter(
            faculty=fac_profile,
            day=slot.day.day,
            is_available=True,
            start_time__lte=slot.time_slot.start_time,
            end_time__gte=slot.time_slot.end_time
        ).exists()
        if avail:
            score += 10

        # Preference-based scoring
        pref = FacultyPreference.objects.filter(faculty=fac_profile).first()
        if pref:
            # Preferred day match (+5)
            if slot.day.day in (pref.preferred_days or []):
                score += 5

            # Preferred time window (+8): slot start falls within window
            if pref.preferred_time_start and pref.preferred_time_end:
                in_window = pref.preferred_time_start <= slot.time_slot.start_time <= pref.preferred_time_end
                if in_window:
                    score += 8

            # Avoid early morning penalty (-10)
            if pref.avoid_early_morning and slot.time_slot.start_time.hour < 9:
                score -= 10

            # Avoid consecutive hours: prefer non-consecutive even softly (-5 extra)
            if pref.avoid_consecutive_hours and user_id and self._would_be_consecutive(user_id, slot):
                score -= 5  # Additional -5 on top of the hard consecutive check

        # Load balancing: penalise if faculty already has many slots today
        day_count = self._faculty_day_count(user_id, slot.day.day) if user_id else 0
        score -= day_count * 3     # -3 per already assigned slot that day

        # Strong penalty for consecutive hours (softly discourage even 2-in-a-row)
        if user_id and self._would_be_consecutive(user_id, slot):
            score -= 20

        return score

    def score_slot_for_course(self, slot, fac_profile, user_id, course=None):
        """
        Extended scoring that also gives a +6 bonus if the course is in
        the faculty's preferred_courses list.
        """
        score = self.score_slot(slot, fac_profile, user_id)
        if course and fac_profile:
            pref = FacultyPreference.objects.filter(faculty=fac_profile).first()
            if pref and pref.preferred_courses.filter(id=course.id).exists():
                score += 6
        return score



    # ─── Main scheduler ──────────────────────────────────────────────────────

    @transaction.atomic
    def run_auto_schedule(self):
        logs = []
        conflicts = []
        success_count = 0

        # All courses for this section/semester
        course_sections = list(CourseSection.objects.filter(
            semester=self.semester,
            section=self.section
        ).select_related('course', 'faculty__user'))

        if not course_sections:
            return {
                'success_count': 0, 'total_requested': 0,
                'logs': [], 'conflicts': ['No course sections found for this plan.']
            }

        # Build discrete class requirements
        classes_to_schedule = []
        for cs in course_sections:
            course = cs.course
            fac_profile = cs.faculty
            user_id = fac_profile.user_id if fac_profile else None

            def add_reqs(n, stype, _cs=cs, _fp=fac_profile, _uid=user_id):
                for _ in range(n):
                    classes_to_schedule.append({
                        'cs': _cs, 'type': stype,
                        'fac_profile': _fp, 'user_id': _uid,
                    })

            add_reqs(course.lecture_hours, 'regular')
            add_reqs(course.tutorial_hours, 'tutorial')
            add_reqs(course.practical_hours, 'lab')

        # Prioritise visiting/adjunct faculty first (most restricted)
        def get_priority(req):
            fp = req['fac_profile']
            if not fp: return 3
            return 1 if fp.designation in ['visiting', 'adjunct'] else 2
        classes_to_schedule.sort(key=get_priority)

        # Faculty workload
        user_ids = list({r['user_id'] for r in classes_to_schedule if r['user_id']})
        global_usage = FacultyAssignment.objects.filter(
            faculty_id__in=user_ids,
            class_session__is_active=True,
            class_session__timetable_slot__plan__semester=self.semester
        ).values('faculty_id').annotate(hours=Count('id'))
        faculty_load = {str(r['faculty_id']): r['hours'] for r in global_usage}

        # Subject consecutive tracker: no subject > 2 consecutive hours
        # { cs_id: { day: [orders] } }
        subject_day_slots = {}
        
        def _would_exceed_subject_consecutive(cs_id, day, order):
            existing = subject_day_slots.get(cs_id, {}).get(day, [])
            all_orders = sorted(existing + [order])
            max_run = 1
            current_run = 1
            for i in range(1, len(all_orders)):
                diff = all_orders[i] - all_orders[i-1]
                CONSEC_THRESHOLD = 2 if max(all_orders) > 100 else 1
                if diff <= CONSEC_THRESHOLD:
                    current_run += 1
                    max_run = max(max_run, current_run)
                else:
                    current_run = 1
            return max_run > 2

        # All empty slots
        all_slots = list(TimetableSlot.objects.filter(plan=self.plan).select_related('day', 'time_slot'))
        breaks = [s for s in all_slots if s.time_slot.is_break]
        empty_slots = [s for s in all_slots if not s.time_slot.is_break and s.id not in self.occupied_slots_for_section]
        empty_slots.sort(key=lambda s: (s.day.order, s.time_slot.start_time))

        # Pick a primary room for all theory logic for this section. Just pick the first available large enough room.
        theory_rooms = self.get_candidate_rooms('theory', self.section.strength)
        primary_theory_room = theory_rooms[0] if theory_rooms else None

        # ── Main placement loop ──
        for req in classes_to_schedule:
            cs = req['cs']
            c_type = req['type']
            fac_profile = req['fac_profile']
            user_id = req['user_id']
            faculty_display = fac_profile.user.full_name if fac_profile else 'N/A'

            if user_id and fac_profile:
                current_load = faculty_load.get(str(user_id), 0)
                if current_load >= fac_profile.max_weekly_hours:
                    conflicts.append(f"Skipped {cs.course.code} ({c_type}): {faculty_display} at max hours ({fac_profile.max_weekly_hours})")
                    continue

            scored_slots = []
            candidate_rooms = self.get_candidate_rooms('practical' if c_type == 'lab' else 'theory', self.section.strength)

            for slot in empty_slots:
                day_code = slot.day.day
                order = slot.time_slot.order if hasattr(slot.time_slot, 'order') else slot.time_slot.start_time.hour * 60 + slot.time_slot.start_time.minute

                # Faculty Must Be Free
                if user_id and not self.is_faculty_free(user_id, slot):
                    continue
                # Hard limit faculty 4 hours/day
                if user_id and self._faculty_day_count(user_id, day_code) >= self.MAX_HOURS_PER_DAY:
                    continue
                # Skip if back-to-back limits reached
                if user_id and self._would_be_consecutive(user_id, slot):
                    continue
                # Skip if subject repeating > 2 hours
                if _would_exceed_subject_consecutive(cs.id, day_code, order):
                    continue

                if fac_profile and fac_profile.designation in ['visiting', 'adjunct']:
                    ok = FacultyAvailability.objects.filter(
                        faculty=fac_profile, day=day_code, is_available=True,
                        start_time__lte=slot.time_slot.start_time,
                        end_time__gte=slot.time_slot.end_time
                    ).exists()
                    if not ok:
                        continue

                # Recommend a room
                best_room_for_slot = None
                if c_type in ['regular', 'tutorial'] and primary_theory_room and self.is_room_free(primary_theory_room.id, slot):
                    best_room_for_slot = primary_theory_room
                else:
                    best_room_for_slot = next((r for r in candidate_rooms if self.is_room_free(r.id, slot)), None)

                if not best_room_for_slot:
                    continue  # Cant run class without a room

                score = self.score_slot(slot, fac_profile, user_id)

                # Bonus for primary room (keeps students stationary)
                if best_room_for_slot == primary_theory_room:
                    score += 50
                
                # Bonus for lab if placed after a break (allows travel)
                if c_type == 'lab':
                    break_before = next((b for b in breaks if b.day == slot.day and b.time_slot.end_time == slot.time_slot.start_time), None)
                    if break_before:
                        score += 30

                scored_slots.append((score, slot, best_room_for_slot))

            # Backup loop: if no slot survived hard constraints, loosen consecutive limits but keep 4/hr day & subject limits
            if not scored_slots and user_id:
                for slot in empty_slots:
                    day_code = slot.day.day
                    order = slot.time_slot.order if hasattr(slot.time_slot, 'order') else slot.time_slot.start_time.hour * 60 + slot.time_slot.start_time.minute
                    
                    if not self.is_faculty_free(user_id, slot):
                        continue
                    if self._faculty_day_count(user_id, day_code) >= self.MAX_HOURS_PER_DAY:
                        continue
                    if _would_exceed_subject_consecutive(cs.id, day_code, order):
                        continue
                        
                    best_room_for_slot = next((r for r in candidate_rooms if self.is_room_free(r.id, slot)), None)
                    if not best_room_for_slot:
                        continue
                        
                    score = self.score_slot(slot, fac_profile, user_id)
                    scored_slots.append((score, slot, best_room_for_slot))

            scored_slots.sort(key=lambda x: x[0], reverse=True)
            
            placed = False
            for score, slot, best_room in scored_slots:
                session = ClassSession.objects.create(
                    tenant=self.tenant, timetable_slot=slot,
                    course_section=cs, session_type=c_type
                )
                if user_id:
                    FacultyAssignment.objects.create(tenant=self.tenant, class_session=session, faculty_id=user_id)
                    faculty_load[str(user_id)] = faculty_load.get(str(user_id), 0) + 1
                    self._add_faculty_slot(user_id, slot)

                RoomAssignment.objects.create(tenant=self.tenant, class_session=session, room=best_room)

                day_code = slot.day.day
                order = slot.time_slot.order if hasattr(slot.time_slot, 'order') else slot.time_slot.start_time.hour * 60 + slot.time_slot.start_time.minute
                subject_day_slots.setdefault(cs.id, {}).setdefault(day_code, []).append(order)

                success_count += 1
                placed = True
                empty_slots.remove(slot)
                self.occupied_slots_for_section.add(slot.id)
                logs.append(f"Placed {cs.course.code} ({c_type}) | {faculty_display} | {slot.day.get_day_display()} {slot.time_slot.name} | Room {best_room.room_number}")
                break

            if not placed:
                reason = "No available slot + free faculty + free room combination" if empty_slots else "No empty slots remaining"
                conflicts.append(f"Could not place {cs.course.code} ({c_type}): {reason}.")

        return {
            'success_count': success_count,
            'total_requested': len(classes_to_schedule),
            'assigned': success_count,
            'skipped': len(classes_to_schedule) - success_count,
            'logs': logs,
            'conflicts': conflicts,
        }
