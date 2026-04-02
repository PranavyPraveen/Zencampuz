import { Link } from 'react-router-dom';

export const Unauthorized = () => {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
            <div className="max-w-md">
                <div className="text-[#EF4444] text-6xl font-black mb-6 opacity-50 tracking-tighter">403</div>
                <h1 className="text-3xl font-bold text-foreground mb-4">ACCESS DENIED</h1>
                <p className="text-muted mb-8">You do not have the required clearance level to access this digital sector.</p>
                <Link to="/dashboard" className="inline-block bg-surface hover:bg-[#2563EB] text-foreground font-bold px-8 py-3 rounded-xl transition-all">
                    RETURN TO BASE
                </Link>
            </div>
        </div>
    );
};
