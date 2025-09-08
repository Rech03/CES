import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import Logout from './Logout';

describe('Logout component', () => {
  it('renders correctly', () => {
    const { getByText } = render(<Logout />);
    expect(getByText('Logout')).toBeInTheDocument();
  });

  it('calls logout function when clicked', () => {
    const logoutMock = jest.fn();
    const { getByText } = render(<Logout onLogout={logoutMock} />);
    const logoutButton = getByText('Logout');
    fireEvent.click(logoutButton);
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});