import React from 'react';

export default function SetupView({ active, setupTab, setSetupTab, newFactorName, setNewFactorName }) {
  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>Configuration (Setup View)</h3>
      <p>Onglet actif : {setupTab}</p>
      {/* Ajoutez le reste de votre interface ici */}
    </div>
  );
}
