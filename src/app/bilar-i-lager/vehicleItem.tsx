/**
 * Vehicle Item Component Stub
 * This is a placeholder for the car inventory feature
 */

import React from 'react';

interface VehicleItemProps {
  vehicle: any;
}

export default function VehicleItem({ vehicle }: VehicleItemProps) {
  return (
    <div className="vehicle-item">
      <p>Vehicle component placeholder</p>
    </div>
  );
}
