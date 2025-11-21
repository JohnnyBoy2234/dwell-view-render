import { render, screen, fireEvent } from '@testing-library/react';
import { PropertyCard } from '../PropertyCard';
import '@testing-library/jest-dom';

const mockProperty = {
  id: '1',
  title: 'Beautiful Apartment',
  address: '123 Main St, City',
  price: 1200,
  beds: 2,
  baths: 1,
  sqft: 850,
  image_url: 'https://example.com/image.jpg',
  is_favorite: false,
  onFavoriteToggle: vi.fn(),
};

describe('PropertyCard', () => {
  it('renders property details correctly', () => {
    render(<PropertyCard {...mockProperty} />);
    
    expect(screen.getByText('Beautiful Apartment')).toBeInTheDocument();
    expect(screen.getByText('123 Main St, City')).toBeInTheDocument();
    expect(screen.getByText('$1,200/mo')).toBeInTheDocument();
    expect(screen.getByText('2 bds | 1 ba | 850 sqft')).toBeInTheDocument();
    expect(screen.getByAltText('Beautiful Apartment')).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('calls onFavoriteToggle when favorite button is clicked', () => {
    const onFavoriteToggle = vi.fn();
    render(<PropertyCard {...mockProperty} onFavoriteToggle={onFavoriteToggle} />);
    
    const favoriteButton = screen.getByRole('button', { name: /favorite/i });
    fireEvent.click(favoriteButton);
    
    expect(onFavoriteToggle).toHaveBeenCalledWith('1');
  });

  it('shows filled heart when property is favorited', () => {
    render(<PropertyCard {...mockProperty} is_favorite={true} />);
    
    const favoriteButton = screen.getByRole('button', { name: /favorite/i });
    expect(favoriteButton).toHaveClass('text-red-500');
  });

  it('shows outline heart when property is not favorited', () => {
    render(<PropertyCard {...mockProperty} is_favorite={false} />);
    
    const favoriteButton = screen.getByRole('button', { name: /favorite/i });
    expect(favoriteButton).toHaveClass('text-gray-400');
  });
});
