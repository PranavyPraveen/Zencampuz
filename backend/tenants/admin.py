from django.contrib import admin
from django.apps import apps
from django.contrib.auth.models import Group

# Rename the Admin Headers to CampuZcore
admin.site.site_header = "CampuZcore Administration"
admin.site.site_title = "CampuZcore Admin Portal"
admin.site.index_title = "Welcome to CampuZcore Database Manager"

# Unregister default Group if not needed
try:
    admin.site.unregister(Group)
except admin.sites.NotRegistered:
    pass

# Dynamically register all models from all apps (except built-in ones like contenttypes/sessions if preferred)
models = apps.get_models()

for model in models:
    try:
        if not admin.site.is_registered(model):
            # Create a simple generic Admin view class for every model
            class GenericAdmin(admin.ModelAdmin):
                # Display all fields in list view except ManyToMany
                list_display = [field.name for field in model._meta.fields]
                
            admin.site.register(model, GenericAdmin)
    except Exception as e:
        # Ignore registration errors (e.g., abstract models)
        pass
