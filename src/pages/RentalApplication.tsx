import { useParams, useSearchParams } from 'react-router-dom';
import { ScreeningApplicationWizard } from '@/components/application/ScreeningApplicationWizard';

export default function RentalApplication() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [searchParams] = useSearchParams();
  const landlordId = searchParams.get('landlord');
  const inviteId = searchParams.get('invite');

  if (!propertyId || !landlordId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Invalid Application Link</h1>
          <p className="text-muted-foreground">The application link appears to be invalid or incomplete.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8">
      <div className="container mx-auto px-4">
        <ScreeningApplicationWizard 
          propertyId={propertyId}
          landlordId={landlordId}
          inviteId={inviteId || undefined}
        />
      </div>
    </div>
  );
}