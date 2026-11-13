import { Compass } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

export default function NotFound() {
  return (
    <Card style={{ marginTop: 24 }}>
      <EmptyState
        icon={Compass}
        title="Page not found"
        text="The page you are looking for does not exist or has moved."
        action={<Button to="/">Go to home</Button>}
      />
    </Card>
  );
}
