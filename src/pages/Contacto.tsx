import { useState } from 'react';
import { clean, md } from '@/cms';
import { CountryCombo, FIELD_CLASS, FIELD_STYLE, HUMAN_CHECK_ON, HumanCheck, PrefixPicker } from '@/components/contact/ContactFields';
import { useLang, useSite, useT } from '@/i18n';
import { A, bottle } from '@/lib/assets';
import { countries } from '@/lib/countries';
import { useReveal } from '@/lib/hooks';
import { type Nav } from '@/lib/routing';

// CONTACTO
export function Contacto({ onNav, inquiryWineId }: { onNav: Nav; inquiryWineId: string | null }) {
  useReveal();
  const t = useT();
  const site = useSite();
  const inquiryWine = inquiryWineId ? t.wineCatalog.find((w) => w.id === inquiryWineId) : undefined;
  const inquiryName = inquiryWine ? [inquiryWine.name, inquiryWine.sub].filter(Boolean).join(' ') : '';
  const CELLAR = `${A}/altamira-vy.jpg`;
  const { lang } = useLang();
  const c = t.contacto;
  const [country, setCountry] = useState('');
  const [prefix, setPrefix] = useState(''); // country whose dialling prefix is shown next to the phone
  const [prefixPicked, setPrefixPicked] = useState(false); // once chosen by hand, picking a country no longer changes it
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState(''); // the robot check's answer
  const [round, setRound] = useState(0); // a new robot check after every attempt (an answer works once)
  const [cleared, setCleared] = useState(0); // remounts the pickers after a message is sent
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'rate' | 'captcha'>('idle');
  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // only runs once the browser's own checks pass
    const form = e.currentTarget;
    if (HUMAN_CHECK_ON && !token) return setStatus('captcha');
    setStatus('sending');
    const d = new FormData(form);
    const list = countries(lang);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: d.get('name'), email: d.get('email'), message: d.get('message'), website: d.get('website'),
          phone, prefix: list.find((x) => x.code === prefix)?.dial ?? '', country: list.find((x) => x.code === country)?.name ?? '', token,
        }),
      });
      const out = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        form.reset();
        setPhone('');
        setCountry('');
        setPrefix('');
        setPrefixPicked(false);
        setCleared((n) => n + 1);
        setStatus('sent');
      } else setStatus(out.error === 'rate' ? 'rate' : out.error === 'captcha' ? 'captcha' : 'error');
    } catch {
      setStatus('error');
    }
    setRound((n) => n + 1);
  };
  const statusText = { idle: '', sending: c.sending, sent: c.sent, error: c.sendError.replace('{email}', site.email), rate: c.tooMany, captcha: c.captcha }[status];
  // browser validation bubbles, in the site's language
  const say = (miss: string, bad: string) => ({
    onInvalid: (e: React.InvalidEvent<HTMLInputElement>) => e.currentTarget.setCustomValidity(e.currentTarget.validity.valueMissing ? miss : bad),
    onInput: (e: React.FormEvent<HTMLInputElement>) => e.currentTarget.setCustomValidity(''),
  });
  const label = (i: number, text: string) => (
    <label htmlFor={`cf-${i}`} className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-ink/[0.62]">{text}</label>
  );
  return (
    <div className="bg-surface w-full">
      <div className="flex flex-col lg:flex-row lg:min-h-[calc(100vh-72px)]">
        {/* Phones: the vineyard-and-Andes photo as a clear band on top (the sign photo closes the page below) */}
        <div className="relative h-[clamp(240px,62vw,340px)] lg:hidden">
          <img {...md(`${A}/contact-mobile-bg.jpg`)} alt="" className="absolute inset-0 size-full object-cover object-[50%_42%]" />
        </div>
        {/* Form left */}
        <div className="relative isolate -mt-px flex-1 bg-surface pt-10 pb-20 px-5 sm:px-9 lg:mt-0 lg:py-20 lg:px-14 flex flex-col">
          <div className="flex flex-col gap-[18px] mb-[25px] reveal">
            <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.62]">{t.contacto.eyebrow}</p>
            <h1 className="font-['Cormorant_Garamond:Light_Italic'] italic text-[32px] sm:text-[40px] lg:text-[46px] text-ink leading-[1.1] lg:leading-[50.6px]">{t.contacto.title}</h1>
          </div>
          <p className="font-['Archivo:Light'] text-[14px] text-ink/[0.7] leading-[25.9px] mb-8 reveal reveal-d1" style={{ fontVariationSettings: '"wdth" 100' }}>
            {t.contacto.intro1}<br />
            {t.contacto.intro2}
          </p>
          {inquiryWine && (
            <div className="mb-9 flex items-center gap-4 border-y border-ink/[0.14] py-4 reveal reveal-d1">
              <img {...bottle(inquiryWine)} alt="" className="h-[64px] w-auto object-contain" />
              <div className="flex flex-col gap-1">
                <span className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-ink/[0.62]">{t.contacto.regarding}</span>
                <span className="font-['Cormorant_Garamond:Regular'] text-[20px] leading-[1.2] text-ink">
                  {inquiryWine.name} <span className="font-['Cormorant_Garamond:Italic'] italic">{inquiryWine.sub}</span>
                </span>
              </div>
            </div>
          )}
          <form className="relative flex flex-col gap-0 reveal reveal-d2" onSubmit={send}>
            {/* a field people never see (and screen readers skip): only spam bots fill it in */}
            <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
              <label>Website<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
            </div>
            <div className="flex flex-col gap-[9px] mb-9">
              {label(0, c.fields[0])}
              <input id="cf-0" name="name" type="text" autoComplete="name" className={FIELD_CLASS} style={FIELD_STYLE} />
            </div>
            <div className="flex flex-col gap-[9px] mb-9">
              {label(1, c.fields[1])}
              <input
                id="cf-1" name="email" type="email" inputMode="email" autoComplete="email" required maxLength={254}
                pattern="[^@\s]+@[^@\s]+\.[^@\s]{2,}"
                {...say(c.required, c.emailInvalid)}
                className={FIELD_CLASS} style={FIELD_STYLE}
              />
            </div>
            <div className="flex flex-col gap-[9px] mb-9">
              {label(2, c.fields[2])}
              <div className="flex items-stretch gap-4">
                <PrefixPicker
                  key={cleared}
                  id="cf-prefix" lang={lang} code={prefix}
                  onCode={(code) => { setPrefix(code); setPrefixPicked(true); }}
                  label={c.prefixLabel} placeholder={c.search} empty={c.noResults}
                />
                <input
                  id="cf-2" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" required maxLength={15}
                  pattern="[0-9]{6,15}" value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  {...say(c.required, c.phoneInvalid)}
                  className={`${FIELD_CLASS} min-w-0 flex-1`} style={FIELD_STYLE}
                />
              </div>
            </div>
            <div className="flex flex-col gap-[9px] mb-9">
              {label(3, c.fields[3])}
              <CountryCombo
                key={cleared}
                id="cf-3" lang={lang} code={country}
                onCode={(code) => { setCountry(code); if (code && !prefixPicked) setPrefix(code); }}
                invalid={c.countryInvalid} empty={c.noResults}
              />
            </div>
            <div className="flex flex-col gap-[9px] mb-7">
              <label htmlFor="cf-msg" className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-ink/[0.62]">{t.contacto.messageLabel}</label>
              <textarea
                id="cf-msg"
                key={inquiryName}
                defaultValue={inquiryName ? t.contacto.inquiry.replace('{wine}', inquiryName) : ''}
                name="message"
                className={`${FIELD_CLASS} resize-none h-[80px]`}
                style={FIELD_STYLE}
              />
            </div>
            <HumanCheck lang={lang} round={round} onToken={(v) => { setToken(v); if (v && status === 'captcha') setStatus('idle'); }} />
            <p className="mb-6 font-['Archivo:Light'] text-[12px] leading-[20px] text-ink/[0.55]" style={{ fontVariationSettings: '"wdth" 100' }}>
              {t.contacto.consentPre}
              <button type="button" onClick={() => onNav('privacidad')} className="underline underline-offset-4 hover:text-ink">
                {t.contacto.consentLink}
              </button>
              .
            </p>
            <button
              type="submit"
              disabled={status === 'sending'}
              className="self-start bg-panel px-[34px] py-[15px] font-['Archivo:Regular'] text-[11px] tracking-[1.32px] uppercase text-on-dark hover:bg-panel-2 transition-colors disabled:cursor-wait disabled:opacity-70"
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {status === 'sending' ? c.sending : t.contacto.submit}
            </button>
            {/* read out by screen readers too */}
            <p role="status" aria-live="polite" className={`mt-4 min-h-[20px] font-['Archivo:Light'] text-[13px] leading-[20px] ${status === 'sent' ? 'text-ink' : 'text-ink/[0.7]'}`} style={FIELD_STYLE}>
              {status === 'sending' ? '' : statusText}
            </p>
          </form>
        </div>

        {/* Image beside the form: the Altamira sign with the contact details. (On phones the other photo is the
            band above the form.) */}
        <div className="relative flex-1 overflow-hidden bg-surface min-h-[440px] lg:min-h-0 lg:bg-panel">
          <div className="absolute inset-0">
            {/* phones: the Altamira sign closes the page; laptops: the vineyard-and-Andes photo (one photo, not two) */}
            <img {...md(CELLAR)} alt="" className="absolute inset-0 size-full object-cover lg:hidden" />
            <img {...md(`${A}/contact-mobile-bg.jpg`)} alt="" className="absolute inset-0 hidden size-full object-cover object-[50%_42%] lg:block" />
            <div className="absolute inset-0 bg-gradient-to-b from-[rgba(20,18,15,0.1)] to-[rgba(20,18,15,0.6)]" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 grid grid-cols-1 gap-x-[26px] gap-y-6 p-6 sm:grid-cols-2 sm:gap-y-8 sm:p-11">
            <div className="flex flex-col gap-[9px]">
              <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-on-dark/[0.65]">{t.contacto.officeLabel}</p>
              <p className="whitespace-pre-line font-['Archivo:Light'] text-[13.5px] text-on-dark leading-[24.3px]" style={{ fontVariationSettings: '"wdth" 100' }}>
                {site.office}
              </p>
            </div>
            <div className="flex flex-col gap-[9px]">
              <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-on-dark/[0.65]">{t.contacto.phoneLabel}</p>
              <p className="font-['Archivo:Light'] text-[13.5px] text-on-dark leading-[24.3px]" style={{ fontVariationSettings: '"wdth" 100' }}>
                {site.phones.map((p) => (
                  <a key={p} href={`tel:${clean(p).replace(/[^\d+]/g, '')}`} className="block whitespace-nowrap hover:underline underline-offset-4">{p}</a>
                ))}
              </p>
            </div>
            <div className="flex flex-col gap-[9px] sm:col-span-2">
              <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-on-dark/[0.65]">{t.contacto.emailLabel}</p>
              <a
                href={`mailto:${clean(site.email)}`}
                className="self-start border-b border-on-dark/[0.4] pb-[5px] font-['Archivo:Light'] text-[13.5px] text-on-dark hover:border-white/70 transition-colors"
                style={{ fontVariationSettings: '"wdth" 100' }}
              >
                {site.email}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
