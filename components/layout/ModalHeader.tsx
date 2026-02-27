import AppHeader from './AppHeader';

interface ModalHeaderProps {
  title?: string;
  showBackButton?: boolean;
}

export default function ModalHeader({ 
  title, 
  showBackButton = true 
}: ModalHeaderProps) {
  return (
    <AppHeader
      variant="standard"
      title={title}
      showBackButton={showBackButton}
      centerTitle
    />
  );
} 
