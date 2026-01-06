// Pricing configuration
const pricing = {
  baseFare: parseInt(process.env.BASE_FARE) || 50,
  perKm: {
    economy: parseInt(process.env.PRICE_PER_KM_ECONOMY) || 10,
    standard: parseInt(process.env.PRICE_PER_KM_STANDARD) || 15,
    premium: parseInt(process.env.PRICE_PER_KM_PREMIUM) || 25,
    xl: parseInt(process.env.PRICE_PER_KM_XL) || 20
  },
  minimumFare: {
    economy: 50,
    standard: 80,
    premium: 150,
    xl: 120
  },
  surgeMultiplier: 1.0 // Can be adjusted based on demand
};

exports.calculateFare = (vehicleType, distance) => {
  const baseFare = pricing.baseFare;
  const perKmRate = pricing.perKm[vehicleType] || pricing.perKm.standard;
  const distanceFare = distance * perKmRate;
  
  let totalFare = (baseFare + distanceFare) * pricing.surgeMultiplier;
  
  // Apply minimum fare
  const minFare = pricing.minimumFare[vehicleType] || pricing.minimumFare.standard;
  totalFare = Math.max(totalFare, minFare);

  return {
    baseFare: Math.round(baseFare),
    distanceFare: Math.round(distanceFare),
    totalFare: Math.round(totalFare),
    currency: 'INR',
    surgeMultiplier: pricing.surgeMultiplier
  };
};

exports.setSurgeMultiplier = (multiplier) => {
  pricing.surgeMultiplier = multiplier;
};

exports.getSurgeMultiplier = () => {
  return pricing.surgeMultiplier;
};
