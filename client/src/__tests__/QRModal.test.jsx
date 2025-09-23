import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import QRModal from '../components/QRModal';

describe('QRModal', () => {
  it('renders QR when provided', () => {
    render(<QRModal isOpen={true} onClose={() => {}} ticketId={'t1'} qrData={{ qr: 'abc', expiresAt: new Date().toISOString() }} issuing={false} />);
    expect(screen.getByText(/Your Ticket QR/i)).toBeInTheDocument();
  });
});
