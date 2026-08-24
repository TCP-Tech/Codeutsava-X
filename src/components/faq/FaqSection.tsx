'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { FAQS } from '@/data/faqs';
import styles from '../sections/EventSections.module.css';

const AsciiFire = dynamic(() => import('@/components/originkit/ui/ascii-flame'), {
  ssr: false,
});

export function FaqSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
  const timer = setTimeout(() => setIsMounted(true), 0);
  return () => clearTimeout(timer);
}, []);

  return (
    <section className={styles.faq} id='faq' aria-labelledby='faq-title'>
      <div className={styles.signalLine} aria-hidden='true'>
        <span>TRANSMISSION // FAQ</span>
        <span>08 FILES FOUND</span>
      </div>

      <div className={styles.faqPanel}>
        {isMounted && (
          <div className={styles.faqFlame} aria-hidden='true'>
            <AsciiFire
              intensity={96}
              windDirection='right'
              windForce={16}
              decay={9}
              turbulence={32}
              thickness={3}
              palette='custom'
              shades={['#13021a', '#3a0b52', '#7218aa', '#9929ea', '#ff5fcf', '#faeb92']}
              sparkColor='#faeb92'
              charset='dense'
              backgroundColor='transparent'
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        )}
        <div className={styles.faqScrim} aria-hidden='true' />

        <div className={styles.faqPanelContent}>
          <div className={styles.faqIntro}>
            <div>
              <p className={styles.eyebrow}>KNOWLEDGE BASE / X.0</p>
              <h2 id='faq-title'>FAQs</h2>
              <p className={styles.introCopy}>
                <strong>New to hackathons?</strong>
                We have you covered with the essential information.
              </p>
            </div>
            <div className={styles.faqStatus} aria-hidden='true'>
              <span>ASCII_FLAME // BACKPLANE</span>
              <span>SIGNAL STABLE</span>
              <span>SELECT A FILE TO DECRYPT</span>
            </div>
          </div>

          <div className={styles.faqGrid}>
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              const answerId = `faq-answer-${index}`;
              return (
                <article className={`${styles.faqItem} ${isOpen ? styles.open : ''}`} key={faq.question}>
                  <button
                    type='button'
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                  >
                    <span className={styles.fileNumber}>{String(index + 1).padStart(2, '0')}</span>
                    <span>{faq.question}</span>
                    <span className={styles.toggle} aria-hidden='true'>{isOpen ? '-' : '+'}</span>
                  </button>
                  <div className={styles.answer} id={answerId} hidden={!isOpen}>
                    <p>{faq.answer}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
