import { render, screen } from '@testing-library/react';
import { Footer } from '../Footer';
import '@testing-library/jest-dom';

describe('Footer', () => {
  it('renders the footer with current year', () => {
    const currentYear = new Date().getFullYear();
    render(<Footer />);
    
    expect(screen.getByText(`© ${currentYear} DwellView. All rights reserved.`)).toBeInTheDocument();
  });

  it('contains navigation links', () => {
    render(<Footer />);
    
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText('Contact Us')).toBeInTheDocument();
  });

  it('has social media links', () => {
    render(<Footer />);
    
    const socialLinks = screen.getAllByRole('link');
    expect(socialLinks.length).toBeGreaterThan(0);
    
    // Check for social media icons (assuming they have aria-labels)
    expect(screen.getByLabelText('Facebook')).toBeInTheDocument();
    expect(screen.getByLabelText('Twitter')).toBeInTheDocument();
    expect(screen.getByLabelText('Instagram')).toBeInTheDocument();
  });
});
