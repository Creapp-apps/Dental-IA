'use client';

import * as Sentry from '@sentry/react';

if (typeof window !== 'undefined') {
  Sentry.init({
    dsn: 'https://c502d27816ee7cf5e3ab792ee05e62ac@o4512200993275904.ingest.us.sentry.io/4512201144401920',
    tracesSampleRate: 1.0,
  });
}

export default function SentryInit() {
  return null;
}
