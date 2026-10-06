import { Link } from 'react-router-dom'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { LegalLayout } from './LegalLayout'

export default function TermsPage() {
  useDocumentMeta({ title: 'Terms of Service', description: 'The rules for using ANIVIA.' })
  return (
    <LegalLayout
      title="Terms of Service"
      updated="October 5, 2026"
      intro="These terms govern your use of ANIVIA. Please read them together with our Privacy Policy."
      sections={[
        { id: 'service', title: 'The service', body: <p>ANIVIA helps you discover anime, follow release schedules and keep track of what you watch. Anime information, images and trailers are provided by third parties (AniList, MyAnimeList via Jikan, YouTube). ANIVIA does not host or stream episodes; “Where to watch” links lead to official, licensed services.</p> },
        { id: 'accounts', title: 'Your account', body: <p>You must provide accurate information and keep your password safe. You’re responsible for activity on your account. You can delete it at any time in Settings → Account.</p> },
        {
          id: 'content',
          title: 'Your content',
          body: <p>You keep the rights to what you add (profile text, scores, lists, messages). If you make your profile public, you allow us to show it to other visitors. Don’t post anything unlawful, hateful, or that infringes others’ rights.</p>,
        },
        {
          id: 'acceptable-use',
          title: 'Acceptable use',
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>No scraping, automated bulk requests or attempts to disrupt the service or the third-party APIs it relies on.</li>
              <li>No attempts to access other users’ accounts or data.</li>
              <li>No use of ANIVIA to find, share or promote unauthorized copies of copyrighted works.</li>
            </ul>
          ),
        },
        { id: 'third-party', title: 'Third-party data', body: <p>Information from AniList and MyAnimeList may be incomplete or out of date, and remains the property of its respective owners. Availability on streaming services varies by region.</p> },
        { id: 'availability', title: 'Availability and changes', body: <p>We may change, suspend or discontinue features at any time. We may suspend accounts that break these terms.</p> },
        { id: 'liability', title: 'Liability', body: <p>The service is provided “as is”. To the extent permitted by law, we are not liable for indirect damages or for content provided by third parties. Nothing in these terms limits rights you have as a consumer under mandatory law.</p> },
        {
          id: 'contact',
          title: 'Contact',
          body: (
            <p>
              Questions? Use <Link to="/contact" className="text-accent-soft hover:underline">the contact form</Link>.
            </p>
          ),
        },
      ]}
    />
  )
}
