export const BubbleButton = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    type="button"
    title={isOpen ? 'Close Guardian assistant' : 'Open Guardian assistant'}
    style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 10000,
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      background: isOpen
        ? 'linear-gradient(135deg, #444, #222)'
        : 'linear-gradient(135deg, #0c6dfd, #0044bb)',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background 0.2s, transform 0.15s',
      color: '#fff',
      fontSize: '22px',
    }}
  >
    {isOpen ? '✕' : '✦'}
  </button>
);
