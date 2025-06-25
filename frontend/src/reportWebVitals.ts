import { onCLS, onFID, onLCP, onINP, onTTFB } from 'web-vitals';
import type { ReportHandler } from 'web-vitals';

const reportWebVitals = (onPerfEntry?: ReportHandler): void => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    onCLS(onPerfEntry);
    onFID(onPerfEntry);
    onLCP(onPerfEntry);
    onINP(onPerfEntry);
    onTTFB(onPerfEntry);
  }
};

export default reportWebVitals;