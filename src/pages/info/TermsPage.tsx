import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { LegalLayout } from './LegalLayout'

export default function TermsPage() {
  useDocumentMeta({ title: 'Terms of Service' })
  return (
    <LegalLayout
      title="Terms of Service"
      updated="October 1, 2026"
      intro="Sample terms for the ANIVIA template. Have your own terms drafted for your jurisdiction and service."
      sections={[
        { id: 'acceptance', title: 'Acceptance of terms', body: <p>By accessing ANIVIA you agree to these terms. If you do not agree, please do not use the service.</p> },
        { id: 'accounts', title: 'Accounts', body: <p>You are responsible for keeping your account credentials secure and for all activity that occurs under your account.</p> },
        {
          id: 'content',
          title: 'Content & licensing',
          body: (
            <p>
              All content made available through the service must be properly licensed by the operator. The demo catalog is fictional and provided for illustration only. Users may not redistribute, scrape or circumvent protection on any content.
            </p>
          ),
        },
        { id: 'subscriptions', title: 'Subscriptions', body: <p>Paid plans, if offered, renew automatically until cancelled. Pricing shown in the template is illustrative and not a binding offer.</p> },
        { id: 'conduct', title: 'Acceptable use', body: <p>Do not misuse the service, interfere with its operation or attempt to access it using methods other than the provided interface.</p> },
        { id: 'liability', title: 'Limitation of liability', body: <p>The service is provided “as is” without warranties of any kind, to the extent permitted by law.</p> },
      ]}
    />
  )
}
