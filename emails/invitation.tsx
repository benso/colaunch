import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Button,
} from '@react-email/components';

interface InvitationEmailProps {
  inviterName: string;
  inviterProduct: string;
  recipientEmail: string;
  referralLink: string;
}

export default function InvitationEmail({
  inviterName = 'Alex Johnson',
  inviterProduct = 'TaskFlow',
  recipientEmail = 'friend@example.com',
  referralLink = 'https://colaunch.app/auth/signup?ref=ABC123',
}: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {inviterName} invited you to find partnership opportunities on CoLaunch
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <div style={logoContainer}>
              <span style={logoDot}></span>
              <span style={logoText}>CoLaunch</span>
            </div>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h1}>You&apos;ve been invited! 🎉</Heading>
            
            <Text style={text}>
              <strong>{inviterName}</strong>, founder of <strong>{inviterProduct}</strong>, 
              thinks you&apos;d be a great fit for CoLaunch.
            </Text>

            <Text style={text}>
              CoLaunch is an AI-powered platform that helps founders discover and forge 
              strategic partnerships. Instead of cold outreach, get matched with complementary 
              businesses that can help you grow faster together.
            </Text>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={referralLink}>
                Accept Invitation
              </Button>
            </Section>

            <Text style={subtext}>
              or copy this link: <Link href={referralLink} style={link}>{referralLink}</Link>
            </Text>

            {/* Features */}
            <Section style={featuresSection}>
              <Heading as="h2" style={h2}>
                What you&apos;ll get:
              </Heading>
              <Text style={feature}>
                ✓ <strong>AI-Powered Matching</strong> – Find perfect partners based on your business
              </Text>
              <Text style={feature}>
                ✓ <strong>Smart Outreach</strong> – AI generates personalized intro messages
              </Text>
              <Text style={feature}>
                ✓ <strong>Curated Opportunities</strong> – Quality over quantity, no spam
              </Text>
              <Text style={feature}>
                ✓ <strong>Exponential Growth</strong> – Unlock distribution without buying ads
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This invitation was sent to {recipientEmail} by {inviterName}.
            </Text>
            <Text style={footerText}>
              CoLaunch – AI-Powered Partnership Matching for Founders
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  marginTop: '40px',
  marginBottom: '40px',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  maxWidth: '600px',
};

const header = {
  backgroundColor: '#0f172a',
  padding: '32px 40px',
};

const logoContainer = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const logoDot = {
  display: 'inline-block',
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: '#10b981',
};

const logoText = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '600',
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
};

const content = {
  padding: '40px',
};

const h1 = {
  color: '#0f172a',
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '1.3',
  margin: '0 0 24px',
};

const h2 = {
  color: '#0f172a',
  fontSize: '20px',
  fontWeight: '600',
  lineHeight: '1.4',
  margin: '32px 0 16px',
};

const text = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const subtext = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '16px 0 0',
  textAlign: 'center' as const,
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#0f172a',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
};

const link = {
  color: '#0f172a',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
};

const featuresSection = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const feature = {
  color: '#334155',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 12px',
};

const footer = {
  backgroundColor: '#f8fafc',
  padding: '24px 40px',
  borderTop: '1px solid #e2e8f0',
};

const footerText = {
  color: '#94a3b8',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '0 0 8px',
  textAlign: 'center' as const,
};

