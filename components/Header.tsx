
import React from 'react';
import { LogoIcon } from './icons/LogoIcon';

export const Header: React.FC = () => {
  return (
    <header className="bg-dark-card/50 backdrop-blur-lg border-b border-dark-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center space-x-3">
          <LogoIcon className="w-8 h-8 text-brand-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-white">
            PredictGenie
          </h1>
        </div>
      </div>
    </header>
  );
};
