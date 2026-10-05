import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { LegalLayout } from './LegalLayout'

export default function PrivacyPage() {
  useDocumentMeta({ title: 'Privacy Policy' })
  return (
    <LegalLayout
      title="Privacy Policy"
      updated="October 1, 2026"
      intro="Sample policy text for the ANIVIA template. Replace it with a policy reviewed for your own service."
      sections={[
        { id: 'overview', title: 'Overview', body: <p>This policy explains what information the ANIVIA interface stores and how it is used. The template itself has no backend and does not transmit personal data.</p> },
        {
          id: 'local-data',
          title: 'Data stored on your device',
          body: (
            <>
              <p>To make the experience feel personal, ANIVIA keeps the following in your browser’s local storage:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Theme and playback preferences</li>
                <li>Watchlist entries, favorites and watch progress (anime and episode identifiers, timestamps)</li>
                <li>Recent search terms</li>
              </ul>
              <p>No passwords, payment details or API secrets are ever stored.</p>
            </>
          ),
        },
        { id: 'cookies', title: 'Cookies & analytics', body: <p>The template does not set tracking cookies or load analytics. If you add analytics to your deployment, disclose it here.</p> },
        { id: 'control', title: 'Your choices', body: <p>You can clear your watch history and search history at any time from Settings → Privacy, or reset all local data from Settings → Account.</p> },
        { id: 'contact', title: 'Contact', body: <p>Questions about this policy can be sent through the Contact page.</p> },
      ]}
    />
  )
}
