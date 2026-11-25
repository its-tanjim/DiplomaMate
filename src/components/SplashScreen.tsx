import React from 'react';
import { LiquidFillLoader } from './LiquidFillLoader';

interface SplashScreenProps {
  onDone: () => void;
}

/**
 * App-open splash: the DiplomaMate logo, centred and modest (not
 * full-screen), with a 3D rotate/float animation and a shine sweep.
 * Tappable to skip.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-app-bg cursor-pointer"
      onClick={onDone}
      role="button"
      aria-label="DiplomaMate — tap to continue"
    >
      <div className="dm-splash-scene">
        <div className="dm-splash-logo">
          <img
            src="/diploma-mate-logo.png"
            alt="DiplomaMate"
            className="w-24 h-24 object-contain rounded-3xl shadow-xl shadow-blue-500/25"
          />
          <span className="dm-splash-shine" aria-hidden="true" />
        </div>
      </div>
      <h1 className="dm-splash-title mt-5 text-2xl font-extrabold tracking-tight text-text-primary">
        DiplomaMate
      </h1>
      <div className="mt-8">
        <LiquidFillLoader size={40} label="Loading..." />
      </div>
    </div>
  );
};
