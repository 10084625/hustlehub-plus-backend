import { describe, expect, test } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import GigCard from '../components/GigCard';
import GigForm from '../components/GigForm';
import PriceTag from '../components/PriceTag';

const Router = ({ children }) => <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{children}</MemoryRouter>;

const gig = {
  id: '6ac735549e27884281dd7d45',
  title: 'Logo design for your brand',
  description: 'Three concepts and two rounds of revisions.',
  category: 'design',
  price: 1850,
  deliveryDays: 6,
  freelancer: { username: 'nomvula' },
};

describe('GigCard', () => {
  test('renders title, price, category and freelancer', () => {
    render(<GigCard gig={gig} />, { wrapper: Router });
    expect(screen.getByRole('link', { name: gig.title })).toHaveAttribute('href', `/gigs/${gig.id}`);
    expect(screen.getByText('Design')).toBeInTheDocument();
    expect(screen.getByText(/nomvula, delivered in 6 days/)).toBeInTheDocument();
    expect(screen.getByText(/1[\s,]?850,00|1[\s,]?850\.00/)).toBeInTheDocument();
  });

  test('shows malicious text as plain text instead of running it (XSS)', () => {
    const evil = { ...gig, title: '<img src=x onerror="window.hacked=1">', description: '<script>window.hacked=1</script>' };
    const { container } = render(<GigCard gig={evil} />, { wrapper: Router });
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('<img src=x onerror="window.hacked=1">')).toBeInTheDocument();
    expect(window.hacked).toBeUndefined();
  });
});

describe('PriceTag', () => {
  test('formats rand values with two decimals', () => {
    render(<PriceTag amount={420.5} />);
    expect(screen.getByText(/420[,.]50/)).toBeInTheDocument();
  });
});

describe('GigForm', () => {
  test('blocks submission and explains every invalid field', async () => {
    let called = false;
    render(<GigForm onSubmit={() => (called = true)} />);
    await userEvent.type(screen.getByLabelText('Title'), '<b>Hi</b>');
    await userEvent.type(screen.getByLabelText('Price (R)'), '10.999');
    await userEvent.click(screen.getByRole('button', { name: 'Publish gig' }));
    expect(screen.getByText('Titles cannot contain HTML.')).toBeInTheDocument();
    expect(screen.getByText('Describe what the client gets.')).toBeInTheDocument();
    expect(screen.getByText('Pick a category.')).toBeInTheDocument();
    expect(screen.getByText('Use at most two decimal places.')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
    expect(called).toBe(false);
  });

  test('submits clean, typed values', async () => {
    let sent;
    render(<GigForm onSubmit={async (d) => { sent = d; }} />);
    await userEvent.type(screen.getByLabelText('Title'), '  Website copywriting  ');
    await userEvent.type(screen.getByLabelText('What the client gets'), 'Clear website copy that turns visitors into customers.');
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'writing');
    await userEvent.type(screen.getByLabelText('Price (R)'), '1200');
    await userEvent.type(screen.getByLabelText('Delivery (days)'), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Publish gig' }));
    expect(sent).toEqual({
      title: 'Website copywriting',
      description: 'Clear website copy that turns visitors into customers.',
      category: 'writing',
      price: 1200,
      deliveryDays: 3,
    });
  });

  test('shows the API error if saving fails', async () => {
    render(<GigForm onSubmit={async () => { throw new Error('You do not have permission to perform this action.'); }} />);
    await userEvent.type(screen.getByLabelText('Title'), 'Website copywriting');
    await userEvent.type(screen.getByLabelText('What the client gets'), 'Clear website copy that turns visitors into customers.');
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'writing');
    await userEvent.type(screen.getByLabelText('Price (R)'), '1200');
    await userEvent.type(screen.getByLabelText('Delivery (days)'), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Publish gig' }));
    const form = screen.getByRole('form', { name: 'Create a gig' });
    expect(await within(form).findByText(/do not have permission/)).toBeInTheDocument();
  });
});
