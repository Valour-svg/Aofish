const items = [];

const names = [
  'One Piece Series - Zoro',
  'One Piece Series - Luffy',
  'Expo Poster',
  'Sidequest Sticker Pack',
  'Aofish Tote',
  'Keychain - Anchor',
  'Print - Coral Hall',
  'Staff Uniform Shirt',
  'Shipping Box Small',
  'Gift Box Ribbon'
];

let index = 0;
while (index < 50) {
  const number = index + 1;
  const optionA = (index % 4) + 1;
  let optionB = optionA + 1;
  if (optionB > 4) {
    optionB = 1;
  }

  const attributeA = (index % 5) + 1;
  let attributeB = attributeA + 1;
  if (attributeB > 5) {
    attributeB = 1;
  }

  const stockA = (index * 7) % 130;
  const stockB = (index * 11) % 130;

  items.push({
    id: number,
    name: names[index % names.length] + ' #' + number,
    sku: 'ITEM-' + String(number).padStart(3, '0'),
    itemTypeId: (index % 4) + 1,
    categoryId: (index % 7) + 1,
    image: null,
    options: [
      {
        optionId: optionA,
        attributes: [
          { attributeId: attributeA, stock: stockA, unitPrice: 100 + number, fee: 10 },
          { attributeId: attributeB, stock: stockB, unitPrice: 120 + number, fee: 12 }
        ]
      },
      {
        optionId: optionB,
        attributes: [
          { attributeId: attributeA, stock: stockA + 5, unitPrice: 90 + number, fee: 8 }
        ]
      }
    ],
    designation: 'E-Shop, Sidequest, ExpoMV',
    gst: number % 2 === 0 ? 'Yes' : 'No',
    packaging: 'Yes',
    status: 'Active',
    updated: '11/10/2026 08:00AM'
  });

  index = index + 1;
}

module.exports = items;
