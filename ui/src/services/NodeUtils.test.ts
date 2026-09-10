import { nodesCPWPIPsInterface } from './NodeUtils';

describe('nodesCPWPIPsInterface', () => {
  it('maps the plane interfaces resolved by Salt', () => {
    expect(
      nodesCPWPIPsInterface({
        control_plane: { ip: '10.200.0.42', interface: 'vlan-cp' },
        workload_plane: { ip: '10.100.0.42', interface: 'vlan-wp' },
      }),
    ).toEqual({
      controlPlane: { ip: '10.200.0.42', interface: 'vlan-cp' },
      workloadPlane: { ip: '10.100.0.42', interface: 'vlan-wp' },
    });
  });

  it('falls back to an empty interface when Salt could not resolve one', () => {
    expect(
      nodesCPWPIPsInterface({
        control_plane: { ip: '10.200.0.42', interface: null },
        workload_plane: { ip: null, interface: null },
      }),
    ).toEqual({
      controlPlane: { ip: '10.200.0.42', interface: '' },
      workloadPlane: { ip: '', interface: '' },
    });
  });

  it('returns empty values when the minion did not answer', () => {
    expect(nodesCPWPIPsInterface('Minion did not return. [No response]')).toEqual({
      controlPlane: { ip: '', interface: '' },
      workloadPlane: { ip: '', interface: '' },
    });
  });
});
