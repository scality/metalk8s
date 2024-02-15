import { render, screen } from '@testing-library/react';
import { Latency } from './Latency';

describe('Latency', () => {
  it('should display the latency in µs', () => {
    //S
    render(<Latency latencyInMicroSeconds={12} />);
    //V
    expect(screen.getByText('12 µs')).toBeInTheDocument();
  });
  it('should display the latency in ms', () => {
    //S
    render(<Latency latencyInMicroSeconds={12000} />);
    //V
    expect(screen.getByText('12.00 ms')).toBeInTheDocument();
  });

  it('should display the latency in s', () => {
    //S
    render(<Latency latencyInMicroSeconds={12000000} />);
    //V
    expect(screen.getByText('12.00 s')).toBeInTheDocument();
  });

  it('should display the latency in m', () => {
    //S
    render(<Latency latencyInMicroSeconds={12 * 60 * 1000 * 1000} />);
    //V
    expect(screen.getByText('12.00 m')).toBeInTheDocument();
  });

  it('should display the latency in h', () => {
    //S
    render(<Latency latencyInMicroSeconds={12 * 60 * 60 * 1000 * 1000} />);
    //V
    expect(screen.getByText('12.00 h')).toBeInTheDocument();
  });

  it('should display the latency in d', () => {
    //S
    render(<Latency latencyInMicroSeconds={12 * 24 * 60 * 60 * 1000 * 1000} />);
    //V
    expect(screen.getByText('12.00 d')).toBeInTheDocument();
  });
});
