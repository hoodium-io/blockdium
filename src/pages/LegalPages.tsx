import { Fragment } from 'react';

/**
 * Terms of Service page.
 *
 * Deliberately a placeholder rather than invented text. Legal terms must be written by
 * whoever is accountable for them — fabricating clauses here would be worse than an honest
 * "not published yet", because a plausible-looking ToS implies commitments nobody made.
 *
 * The structure below is the outline the real document should fill in.
 */
export function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="Not yet published"
      intro="Blockdium is in beta and these Terms have not been finalised. The sections below are the outline the published document will follow."
      sections={[
        {
          heading: 'Use of the service',
          body: 'Blockdium is a read-only interface to Hoodium chain data. It holds no funds, cannot move funds, and has no ability to modify chain state.',
        },
        {
          heading: 'No warranty',
          body: 'Data is provided as-is from a self-hosted index and may be incomplete, delayed, or wrong. Do not rely on it as a sole source for financial decisions.',
        },
        {
          heading: 'Third-party services',
          body: 'Wallet interaction, if enabled, occurs entirely in your browser via your own wallet extension. Blockdium never receives your keys.',
        },
        {
          heading: 'Changes',
          body: 'These terms will change while the project is in development.',
        },
      ]}
    />
  );
}

/**
 * Privacy Policy page.
 *
 * Also a placeholder. Note the one claim that IS accurate today and worth stating: the
 * explorer sets no cookies and has no analytics, because nothing has been added to do so.
 */
export function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="Not yet published"
      intro="The privacy policy has not been finalised. What the app does today is described below so you are not left guessing."
      sections={[
        {
          heading: 'What this app collects',
          body: 'Blockdium sets no cookies and includes no analytics or tracking scripts. Page data is fetched from the Blockdium API; ordinary server access logs may record IP addresses and requested paths.',
        },
        {
          heading: 'Your wallet',
          body: 'If you use the "Add Mainchain Devnet" button, the request is handled by your wallet extension. Your keys never leave it and are never sent to this site.',
        },
        {
          heading: 'Third parties',
          body: 'No third-party analytics, advertising, or tracking services are used.',
        },
      ]}
    />
  );
}

function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: { heading: string; body: string }[];
}) {
  return (
    <section className="legal">
      <h1>{title}</h1>
      <p className="legal__updated muted">Last updated: {updated}</p>
      <p className="legal__intro">{intro}</p>

      {sections.map((s) => (
        <Fragment key={s.heading}>
          <h2>{s.heading}</h2>
          <p>{s.body}</p>
        </Fragment>
      ))}
    </section>
  );
}
