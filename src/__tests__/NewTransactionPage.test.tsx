import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NewTransactionPage } from '../pages/app/NewTransactionPage';

const listProducts = vi.fn();
const listWarehouses = vi.fn();
const getOnHand = vi.fn();

vi.mock('../services/inventoryApi', () => ({
  inventoryApi: {
    listProducts: (...args: unknown[]) => listProducts(...args),
    listWarehouses: (...args: unknown[]) => listWarehouses(...args),
    getOnHand: (...args: unknown[]) => getOnHand(...args),
    createTransaction: vi.fn(),
    createTransfer: vi.fn()
  }
}));

describe('NewTransactionPage', () => {
  beforeEach(() => {
    listProducts.mockResolvedValue([
      {
        id: 1,
        sku: 'P-1',
        name: 'Fertilizer',
        unit: 'kg',
        category: null,
        barcode: null,
        minStock: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);
    listWarehouses.mockResolvedValue([
      {
        id: 10,
        code: 'MAIN',
        name: 'Main Depot',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);
    getOnHand.mockResolvedValue([{ productId: 1, warehouseId: 10, quantityOnHand: 10 }]);
  });

  it('cannot submit without required fields', async () => {
    render(
      <MemoryRouter>
        <NewTransactionPage />
      </MemoryRouter>
    );

    const submitButton = screen.getByRole('button', { name: /create transaction/i });
    expect(submitButton).toBeDisabled();

    await userEvent.selectOptions(await screen.findByLabelText(/product/i), '1');
    await userEvent.selectOptions(screen.getByLabelText(/warehouse/i), '10');
    await userEvent.clear(screen.getByLabelText(/quantity/i));
    await userEvent.type(screen.getByLabelText(/quantity/i), '5');

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });
  });

  it('updates resulting on-hand preview when quantity changes', async () => {
    render(
      <MemoryRouter>
        <NewTransactionPage />
      </MemoryRouter>
    );

    await userEvent.selectOptions(await screen.findByLabelText(/product/i), '1');
    await userEvent.selectOptions(screen.getByLabelText(/warehouse/i), '10');

    await waitFor(() => {
      expect(screen.getByText(/current on-hand:/i)).toHaveTextContent('10');
    });

    await userEvent.clear(screen.getByLabelText(/quantity/i));
    await userEvent.type(screen.getByLabelText(/quantity/i), '3');

    await waitFor(() => {
      expect(screen.getByText(/resulting on-hand:/i)).toHaveTextContent('13');
    });
  });
});
