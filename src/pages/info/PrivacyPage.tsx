import { t } from '@/i18n'
import { Link } from 'react-router-dom'
import { config } from '@/config'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { LegalLayout } from './LegalLayout'

const contact = config.supportEmail ? <a href={`mailto:${config.supportEmail}`} className="text-accent-soft hover:underline">{config.supportEmail}</a> : <Link to="/contact" className="text-accent-soft hover:underline">{t('the contact form')}</Link>

export default function PrivacyPage() {
  useDocumentMeta({ title: t('Privacy Policy'), description: t('What ANIVIA stores, why, and how you can control it.') })
  return (
    <LegalLayout
      title={t('Privacy Policy')}
      updated="October 5, 2026"
      intro="This policy explains what personal data ANIVIA processes, why, who helps us run the service, and the rights you have."
      sections={[
        {
          id: 'controller',
          title: t('Who is responsible'),
          body: <p>ANIVIA (“we”) is responsible for the processing described here. You can reach us via {contact}.</p>,
        },
        {
          id: 'account',
          title: t('Account data'),
          body: (
            <>
              <p>{t('When you create an account we process:')}</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>{t('your email address and a securely hashed password (or the identifier from Google, Discord or GitHub if you sign in with them);')}</li>
                <li>{t('your profile: display name, optional username, bio and avatar color;')}</li>
                <li>{t('your library: watchlist, watch progress, favorites, your own scores and your settings — so they sync between your devices.')}</li>
              </ul>
              <p>{t('Legal basis: performance of our contract with you (GDPR Art. 6(1)(b)). Profiles are private unless you make them public in Settings → Privacy.')}</p>
            </>
          ),
        },
        {
          id: 'messages',
          title: t('Messages and reports'),
          body: <p>{t('If you use the contact form or report an issue, we store what you send (name, email, message or report details and the page it concerns) to answer and fix things. These are deleted when no longer needed, at the latest after 12 months.')}</p>,
        },
        {
          id: 'device',
          title: t('Data stored on your device'),
          body: (
            <>
              <p>{t('ANIVIA keeps your preferences, library and a cache of public anime data in your browser’s local storage so the site is fast and works offline. If you’re signed in, your session token is stored there too. We don’t use advertising or tracking cookies.')}</p>
              <p>{t('You can clear this at any time in Settings → Speed & data and Settings → Account, or through your browser.')}</p>
            </>
          ),
        },
        {
          id: 'analytics',
          title: t('Usage statistics'),
          body: (
            <>
              <p>
                Only if you click “Allow” on the statistics prompt, ANIVIA records which pages are opened, how long they stay open (while the tab is visible), the referring website’s domain, your device class
                (mobile / tablet / desktop), browser language and user agent. A random visitor id stored in your browser groups the visits; if you’re signed in, visits are linked to your account. No IP addresses
                are stored and nothing is shared with advertisers.
              </p>
              <p>
                Statistics are stored in our Supabase database and deleted after 180 days. Anime pages show aggregated counts (e.g. “views this week”) without personal data. “Do Not Track” / Global Privacy
                Control are respected. You can change your choice at any time in Settings → Privacy.
              </p>
            </>
          ),
        },
        {
          id: 'processors',
          title: t('Service providers'),
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li><strong className="text-fg">{t('Supabase')}</strong>{' '}{t('— accounts, authentication, database hosting (library, usage statistics, cached anime data) and server functions.')}</li>
              <li><strong className="text-fg">{t('Cloudflare')}</strong> — hosting, content delivery and security{config.cfAnalyticsToken ? ', plus cookie-free, aggregated visitor statistics (Web Analytics)' : ''}.</li>
              <li><strong className="text-fg">{t('AniList')}</strong>{' '}{t('and')}{' '}<strong className="text-fg">{t('Jikan / MyAnimeList')}</strong>{' '}{t('and')}{' '}<strong className="text-fg">{t('ani.zip')}</strong>{' '}{t('— public anime information. No account data is sent. If you connect AniList, your AniList access token is stored on your ANIVIA account (readable only by you) so the connection works on all your devices until you disconnect it.')}</li>
              <li><strong className="text-fg">{t('YouTube')}</strong>{' '}{t('— official trailers load from youtube-nocookie.com only after you press play (or enable trailer autoplay). YouTube’s own privacy policy applies to the player.')}</li>
              <li>{t('Sign-in providers you choose (Google, Discord, GitHub).')}</li>
            </ul>
          ),
        },
        {
          id: 'retention',
          title: t('How long we keep data'),
          body: <p>{t('Account and library data are kept while your account exists. Deleting your account (Settings → Account → Delete account) permanently removes your profile and synced library immediately; backups at our providers expire on their normal schedule.')}</p>,
        },
        {
          id: 'rights',
          title: t('Your rights'),
          body: (
            <p>
              You can access, correct, export or delete your data, object to or restrict processing, and complain to your local data-protection authority. Most of this you can do yourself in Settings; for anything else contact us via {contact}.
            </p>
          ),
        },
        {
          id: 'children',
          title: t('Children'),
          body: <p>{t('ANIVIA is not directed at children under 16, who may only create an account with the consent of a parent or guardian.')}</p>,
        },
        {
          id: 'changes',
          title: t('Changes'),
          body: <p>{t('We’ll update this page when our processing changes and show the date at the top. Significant changes will be announced in the app.')}</p>,
        },
      ]}
    />
  )
}
