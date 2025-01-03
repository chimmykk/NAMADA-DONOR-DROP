import type { AppProps } from 'next/app';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'test') {
      fetch('/api/init', {
        headers: {
          'x-init-token': process.env.NEXT_PUBLIC_INIT_SECRET ?? '',
          'host': process.env.NEXT_PUBLIC_ALLOWED_HOST ?? ''
        } as HeadersInit
      }).catch(console.error);
    }
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp; 