import React from "react";

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-primarylw">
      <div className="text-center space-y-4 max-w-md p-6">
        <h1 className="text-6xl font-black text-foreground">404</h1>
        <p className="text-xl text-muted-foreground">Oops! Page not found</p>
        <div>
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Return to Home
          </a>
        </div>
      </div>
    </div>
  );
};
