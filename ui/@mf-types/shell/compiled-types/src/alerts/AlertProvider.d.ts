import React from 'react';
/**
 * A wrapper fetching alerts and ensuring their accuracy via a polling refresh strategy.
 *
 * @param string alert manager url
 * @param React.ReactNode children react node
 * @returns
 */
export default function AlertProvider({ alertManagerUrl, children, }: {
    alertManagerUrl: string;
    children: React.ReactNode;
}): JSX.Element;
