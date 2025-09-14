
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-dark-bg border-t border-dark-border mt-12">
      <div className="container mx-auto px-4 py-4 text-center text-dark-text-secondary">
        <p>&copy; {new Date().getFullYear()} PredictGenie. All rights reserved.</p>
      </div>
    </footer>
  );
};
