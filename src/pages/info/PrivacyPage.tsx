import { Link } from 'react-router-dom'
import { config } from '@/config'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { LegalLayout } from './LegalLayout'

const contact = config.supportEmail ? <a href={`mailto:${config.supportEmail}`} className="text-accent-soft hover:underline">{config.supportEmail}</a> : <Link to="/contact" className="text-accent-soft hover:underline">the contact form</Link>

export default function PrivacyPage() {
  useDocumentMeta({ title: 'Privacy Policy', description: 'What ANIVIA stores, why, and how you can control it.' })
  return (
    <LegalLayout
      title="Privacy Policy"
      updated="October 5, 2026"
      intro="This policy explains what personal data ANIVIA processes, why, who helps us run the service, and the rights you have. Have it reviewed for your jurisdiction before going live."
      sections={[
        {
          id: 'controller',
          title: 'Who is responsible',
          body: <p>ANIVIA (“we”) is responsible for the processing described here. You can reach us via {contact}.</p>,
        },
        {
          id: 'account',
          title: 'Account data',
          body: (
            <>
              <p>When you create an account we process:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>your email address and a securely hashed password (or the identifier from Google, Discord or GitHub if you sign in with them);</li>
                <li>your profile: display name, optional username, bio and avatar color;</li>
                <li>your library: watchlist, watch progress, favorites, your own scores and your settings — so they sync between your devices.</li>
              </ul>
              <p>Legal basis: performance of our contract with you (GDPR Art. 6(1)(b)). Profiles are private unless you make them public in Settings → Privacy.</p>
            </>
          ),
        },
        {
          id: 'messages',
          title: 'Messages and reports',
          body: <p>If you use the contact form or report an issue, we store what you send (name, email, message or report details and the page it concerns) to answer and fix things. These are deleted when no longer needed, at the latest after 12 months.</p>,
        },
        {
          id: 'device',
          title: 'Data stored on your device',
          body: (
            <>
              <p>ANIVIA keeps your preferences, library and a cache of public anime data in your browser’s local storage so the site is fast and works offline. If you’re signed in, your session token is stored there too. We don’t use advertising or tracking cookies.</p>
              <p>You can clear this at any time in Settings → Speed &amp; data and Settings → Account, or through your browser.</p>
            </>
          ),
        },
        {
          id: 'processors',
          title: 'Service providers',
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li><strong className="text-fg">Supabase</strong> — accounts, authentication and database hosting.</li>
              <li><strong className="text-fg">Cloudflare</strong> — hosting, content delivery and security{config.cfAnalyticsToken ? ', plus cookie-free, aggregated visitor statistics (Web Analytics)' : ''}.</li>
              <li><strong className="text-fg">AniList</strong> and <strong className="text-fg">Jikan / MyAnimeList</strong> — public anime information. Your browser requests this data; no account data is sent.</li>
              <li><strong className="text-fg">YouTube</strong> — official trailers load from youtube-nocookie.com only after you press play (or enable trailer autoplay). YouTube’s own privacy policy applies to the player.</li>
              <li>Sign-in providers you choose (Google, Discord, GitHub).</li>
            </ul>
          ),
        },
        {
          id: 'retention',
          title: 'How long we keep data',
          body: <p>Account and library data are kept while your account exists. Deleting your account (Settings → Account → Delete account) permanently removes your profile and synced library immediately; backups at our providers expire on their normal schedule.</p>,
        },
        {
          id: 'rights',
          title: 'Your rights',
          body: (
            <p>
              You can access, correct, export or delete your data, object to or restrict processing, and complain to your local data-protection authority. Most of this you can do yourself in Settings; for anything else contact us via {contact}.
            </p>
          ),
        },
        {
          id: 'children',
          title: 'Children',
          body: <p>ANIVIA is not directed at children under 16, who may only create an account with the consent of a parent or guardian.</p>,
        },
        {
          id: 'changes',
          title: 'Changes',
          body: <p>We’ll update this page when our processing changes and show the date at the top. Significant changes will be announced in the app.</p>,
        },
      ]}
    />
  )
}
