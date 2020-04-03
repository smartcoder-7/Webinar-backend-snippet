

export const roundNumber = ( value: number, decimals: number = 2) => {
    return parseFloat((value).toFixed(decimals));
};

export const roundPercentage = ( value: number, decimals: number = 2) => {
    return roundNumber(value * 100, decimals);
};