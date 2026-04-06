'use client';

import { useEffect, useState, useCallback } from 'react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CACHE_KEY = 'shri-harivansh.dailyQuote';

function buildQuoteUrl(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const monthName = MONTH_NAMES[date.getMonth()];
  return `https://radhakelikunj.com/wp-content/uploads/${year}/${month}/Premanand-Ji-Maharaj-Quote-${day}-${monthName}-${year}.webp`;
}

function formatDate(date) {
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function testImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

export default function DailyQuote() {
  const [quoteUrl, setQuoteUrl] = useState(null);
  const [quoteDate, setQuoteDate] = useState(null);
  const [isLatest, setIsLatest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const loadQuote = useCallback(async () => {
    // 1. Show cached version immediately
    const todayStr = new Date().toDateString();

    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (cached && cached.url) {
        setQuoteUrl(cached.url);
        setQuoteDate(cached.dateLabel);
        setIsLatest(cached.dateKey === todayStr);
        if (cached.dateKey === todayStr) {
          setLoading(false);
          return;
        }
      }
    } catch (_) {}

    // 2. Try today, then walk back up to 5 days
    const today = new Date();
    for (let offset = 0; offset <= 5; offset++) {
      const d = new Date(today);
      d.setDate(d.getDate() - offset);
      const url = buildQuoteUrl(d);
      const ok = await testImage(url);
      if (ok) {
        const dateLabel = formatDate(d);
        const dateKey = d.toDateString();
        setQuoteUrl(url);
        setQuoteDate(dateLabel);
        setIsLatest(offset === 0);
        setLoading(false);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ 
          url, 
          dateLabel, 
          dateKey
        }));
        return;
      }
    }

    // If nothing found, keep cache
    setLoading(false);
  }, []);

  useEffect(() => {
    loadQuote();
  }, [loadQuote]);

  useEffect(() => {
    if (!fullscreen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreen]);

  if (!quoteUrl) {
    if (loading) {
      return (
        <section className="daily-quote-section panel">
          <div className="daily-quote-loading">
            <div className="quote-shimmer" />
          </div>
        </section>
      );
    }
    return null;
  }

  return (
    <>
      <section className="daily-quote-section panel">
        <div className="daily-quote-header">
          <div>
            <p className="eyebrow">गुरु वचन</p>
            <h3 className="daily-quote-title">Quote of the Day</h3>
          </div>
          <div className="daily-quote-meta">
            <span className="daily-quote-date">{quoteDate}</span>
            {isLatest && <span className="daily-quote-badge">Today</span>}
            {!isLatest && !loading && (
              <span className="daily-quote-badge stale">Latest available</span>
            )}
          </div>
        </div>

        <div
          className="daily-quote-frame"
          onClick={() => setFullscreen(true)}
          role="button"
          tabIndex={0}
          aria-label="View quote fullscreen"
          onKeyDown={(e) => e.key === 'Enter' && setFullscreen(true)}
        >
          <div className="daily-quote-glow" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={quoteUrl}
            alt={`Pujya Maharaj Ji's Quote — ${quoteDate}`}
            className="daily-quote-img"
            loading="eager"
          />
          <div className="daily-quote-overlay">
            <span>Click to enlarge</span>
          </div>
        </div>

        <p className="daily-quote-credit">
          — Pujya Shri Hit Premanand Govind Sharan Ji Maharaj
        </p>
      </section>

      {/* Fullscreen lightbox */}
      {fullscreen && (
        <div
          className="quote-lightbox"
          onClick={() => setFullscreen(false)}
          role="dialog"
          aria-label="Quote fullscreen view"
        >
          <button
            className="quote-lightbox-close"
            onClick={() => setFullscreen(false)}
            aria-label="Close"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={quoteUrl}
            alt={`Pujya Maharaj Ji's Quote — ${quoteDate}`}
            className="quote-lightbox-img"
          />
        </div>
      )}
    </>
  );
}
