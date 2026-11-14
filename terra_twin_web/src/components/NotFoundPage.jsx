import React from 'react';
import Brand from './Brand';
import { navigate } from '../navigation';

export default function NotFoundPage({ onGoHome }) {
  return (
    <section
      className="card not-found-page"
      role="region"
      aria-label="Page not found"
      style={{
        maxWidth: '560px',
        margin: '3rem auto',
        textAlign: 'center',
        padding: '2.5rem 1.5rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
        <Brand />
      </div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', color: 'var(--navy)' }}>
        Page Not Found (404)
      </h1>
      <p style={{ color: 'var(--secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
        The requested address does not exist or has been moved. You can explore the screening dataset on the map.
      </p>
      <button
        type="button"
        className="btn-primary"
        onClick={() => {
          if (onGoHome) onGoHome('map');
          else navigate('map');
        }}
      >
        Return to Screening Map
      </button>
    </section>
  );
}
