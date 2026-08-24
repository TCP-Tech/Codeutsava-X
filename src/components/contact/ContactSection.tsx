'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Send, MapPin, ExternalLink, CheckCircle } from 'lucide-react';
import styles from './ContactSection.module.css';

const AsciiFire = dynamic(() => import('@/components/originkit/ui/ascii-flame'), {
  ssr: false,
});

export function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
  });

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
  const timer = setTimeout(() => setIsMounted(true), 0);
  return () => clearTimeout(timer);
}, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    setStatus('submitting');
    setTimeout(() => {
      setStatus('success');
      setFormData({
        name: '',
        phone: '',
        email: '',
        message: '',
      });
      setTimeout(() => setStatus('idle'), 6000);
    }, 1200);
  };

  return (
    <section className={styles.contactSection} id="contact" aria-labelledby="contact-title">
      {/* Top High-Tech Signal Header Line */}
      <div className={styles.signalLine} aria-hidden="true">
        <span>TRANSMISSION // CONTACT MATRIX</span>
        <span>LOCATION // 21.2497° N, 81.6050° E</span>
        <span>STATUS // CHANNELS ACTIVE</span>
      </div>

      {/* Main Glitchverse Contact Panel */}
      <div className={styles.contactPanel}>
        {/* ASCII Fire Background Effect - rendered on all devices including Android */}
        {isMounted && (
          <div className={styles.flameBackdrop} aria-hidden="true">
            <AsciiFire
              intensity={96}
              windDirection="right"
              windForce={16}
              decay={9}
              turbulence={32}
              thickness={3}
              palette="custom"
              shades={['#13021a', '#3a0b52', '#7218aa', '#9929ea', '#ff5fcf', '#faeb92']}
              sparkColor="#faeb92"
              charset="dense"
              backgroundColor="transparent"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        )}

        {/* CRT Scanline & Radial Scrim Backdrop */}
        <div className={styles.panelScrim} aria-hidden="true" />

        {/* Panel Inner Content */}
        <div className={styles.panelContent}>
          {/* Header Intro Area */}
          <div className={styles.contactIntro}>
            <div>
              <p className={styles.eyebrow}>COMMUNICATION INTERFACE // X.0</p>
              <h1 id="contact-title">HAVE SOME QUESTIONS?</h1>
            </div>
          </div>

          {/* 2-Column Responsive Layout: Left Form + Right Map */}
          <div className={styles.contactLayout}>

            {/* LEFT COLUMN: CONTACT FORM */}
            <div className={styles.formCard}>
              <div>
                <div className={styles.formHeader}>
                  <h2>CONTACT US</h2>
                  <span className={styles.formTag}>SIGNAL // 01</span>
                </div>

                <form onSubmit={handleSubmit} className={styles.contactForm}>
                  {/* Field 1: Name */}
                  <div className={styles.formGroup}>
                    <label htmlFor="name" className={styles.formLabel}>
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your name"
                      className={styles.formInput}
                    />
                  </div>

                  {/* Field 2: Contact Number */}
                  <div className={styles.formGroup}>
                    <label htmlFor="phone" className={styles.formLabel}>
                      Contact Number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Enter your Phone Number"
                      className={styles.formInput}
                    />
                  </div>

                  {/* Field 3: Email */}
                  <div className={styles.formGroup}>
                    <label htmlFor="email" className={styles.formLabel}>
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your Email"
                      className={styles.formInput}
                    />
                  </div>

                  {/* Field 4: Message */}
                  <div className={styles.formGroup}>
                    <label htmlFor="message" className={styles.formLabel}>
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={2}
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Enter your message"
                      className={styles.formTextarea}
                    />
                  </div>

                  {/* SUBMIT BUTTON */}
                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className={styles.submitBtn}
                  >
                    {status === 'submitting' ? (
                      <span>TRANSMITTING...</span>
                    ) : (
                      <>
                        <span>SUBMIT</span>
                        <Send size={16} />
                      </>
                    )}
                  </button>

                  {status === 'success' && (
                    <div className={styles.successAlert} role="alert">
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle size={16} />
                        <span>TRANSMISSION RECEIVED // WE WILL GET BACK TO YOU SHORTLY</span>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* RIGHT COLUMN: NIT RAIPUR MAP */}
            <div className={styles.mapCard}>
              <div className={styles.mapHeader}>
                <h2>LOCATION // RADAR</h2>
                <span className={styles.formTag}>CAMPUS MAP</span>
              </div>

              <div className={styles.mapWrapper}>
                <div className={styles.mapOverlayBadge}>
                  <div className={styles.radarDot} />
                  <span>NIT RAIPUR CAMPUS</span>
                </div>

                <iframe
                  title="NIT Raipur Map Location"
                  className={styles.mapIframe}
                  src="https://maps.google.com/maps?q=National+Institute+of+Technology+Raipur,+G.E.+Road,+Raipur,+Chhattisgarh+492010&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>

              <div className={styles.mapFooterDetails}>
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-[#ff5fcf] shrink-0" />
                  <span className={styles.mapAddress}>
                    G.E. Road, Raipur, Chhattisgarh 492010
                  </span>
                </div>

                <a
                  href="https://www.google.com/maps/place/National+Institute+of+Technology+Raipur/@21.249722,81.605000,16z"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.directionsBtn}
                >
                  <span>GET DIRECTIONS</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
