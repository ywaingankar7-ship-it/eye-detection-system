import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global log suppression for MediaPipe/TFLite noise
const suppressMediaPipeLogs = () => {
  const methods: (keyof Console)[] = ['log', 'info', 'warn', 'error', 'debug', 'trace'];
  
  const isNoise = (args: any[]) => {
    return args.some(arg => 
      typeof arg === 'string' && 
      (
        arg.includes('XNNPACK delegate') || 
        arg.includes('INFO: Created') || 
        arg.includes('Created TensorFlow Lite') ||
        arg.includes('TfLiteRuntime') ||
        arg.includes('mediapipe')
      )
    );
  };

  methods.forEach(method => {
    const original = console[method] as Function;
    (console[method] as any) = (...args: any[]) => {
      if (isNoise(args)) return;
      original.apply(console, args);
    };
  });
};

suppressMediaPipeLogs();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
