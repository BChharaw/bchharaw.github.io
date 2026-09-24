import React, { useState } from 'react';
import CopyEmail from '../CopyEmail';
import { profile, problemMailto } from '../../data/site';
import './ContactSection.css';

const ContactSection = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('idle');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('https://formspree.io/f/mnjwjpwe', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus('sent');
      setForm({ name: '', email: '', message: '' });
    } catch {
      setStatus('error');
    }
  };

  return (
    <footer id="contact" className="section contact">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow"><b>07</b> Contact</p>
          <div>
            <h2 className="h2">Got a hard problem? Send it over.</h2>
            <p className="lede">
              Learned control, perception, embedded, simulation, or something that doesn’t fit a category. If it’s
              hard and it matters, I want to hear about it. Email is fastest; I usually reply within a day.
            </p>
          </div>
        </div>

        <div className="contact-grid">
          <div className="contact-direct">
            <div className="contact-actions">
              <a className="btn btn-primary" href={problemMailto}>Send me a problem</a>
              <CopyEmail className="btn" />
              <a className="btn" href={profile.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a className="btn" href={profile.github} target="_blank" rel="noopener noreferrer">GitHub</a>
              {profile.resume && <a className="btn" href={profile.resume} target="_blank" rel="noopener noreferrer">Resume (PDF)</a>}
            </div>
            <dl className="kv">
              <div><dt>Now</dt><dd><span className="status">{profile.current.title}, {profile.current.org}</span></dd></div>
              <div><dt>Range</dt><dd>{profile.range}</dd></div>
              <div><dt>Location</dt><dd>Canada</dd></div>
            </dl>
          </div>

          <form className="contact-form" onSubmit={submit}>
            {status === 'sent' ? (
              <p className="form-note" role="status">Thanks, your message was sent. I’ll get back to you soon.</p>
            ) : (
              <>
                <div className="form-row">
                  <label>
                    <span>Name</span>
                    <input type="text" value={form.name} onChange={set('name')} required autoComplete="name" />
                  </label>
                  <label>
                    <span>Email</span>
                    <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
                  </label>
                </div>
                <label>
                  <span>Message</span>
                  <textarea rows={5} value={form.message} onChange={set('message')} required />
                </label>
                {status === 'error' && (
                  <p className="form-note is-error" role="alert">
                    That didn’t go through. Please email me directly at {profile.email}.
                  </p>
                )}
                <div>
                  <button type="submit" className="btn" disabled={status === 'sending'}>
                    {status === 'sending' ? 'Sending…' : 'Send message'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>

        <div className="colophon">
          <p>© {new Date().getFullYear()} {profile.name}</p>
          <p>
            Built with React and a lot of late nights in E7. The hero drive runs{' '}
            <a href="https://github.com/mattbradley/dash" target="_blank" rel="noopener noreferrer">Dash</a> (MIT).
          </p>
        </div>
      </div>
    </footer>
  );
};

export default ContactSection;
