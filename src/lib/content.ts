/** Editable development copy; confirmed operational data belongs in Shopify Admin. */
export const settings = {
  name: 'buttersalt',
  locale: 'en-AU',
  currency: 'AUD',
  country: 'AU',
  development: true,
  mixedBoxSize: 6,
  delivery: 'Delivery options and costs will be confirmed before launch. In live mode, Shopify calculates delivery at checkout.',
  foodNotice: 'Flavour and packaging concepts. Ingredients, allergens, nutrition, sizes and stock await confirmation. These concepts are unavailable for live sale.',
  priceNotice: 'Illustrative AUD prices for this development preview.',
  imageryNotice: 'Original concept visualisations; not photographs of manufactured stock.',
  contactEmail: null as string | null,
  legalEntity: null as string | null,
  businessAddress: null as string | null,
};

export const brand = {
  name: 'buttersalt',
  tagline: 'A little more delicious.',
  heroEyebrow: 'POPCORN WITH PERSONALITY',
  heroHeading: 'little kernels.\nbig feelings.',
  heroDescription: 'Popcorn with personality. Explore a colourful collection of sweet, savoury and delightfully unexpected flavours.',
  about: 'We believe a handful of something delicious can make an ordinary moment feel a little brighter. buttersalt is a contemporary popcorn concept built around bold flavour, thoughtful design and the simple pleasure of sharing.',
  gift: 'A thank-you, a team treat, a little something just because. Find a flavourful gift, or tell us what you have in mind.',
  newsletter: 'Something delicious is on the way. Join the list for launch news and flavour notes.',
};

export const faqs = [
  { question: 'Can I buy buttersalt yet?', answer: 'This is a development preview of the buttersalt concept range. You can explore flavours and try the basket, but payments and orders are unavailable until products and merchant services are confirmed.' },
  { question: 'Where can I find ingredients and allergens?', answer: 'Verified ingredients, allergen statements and nutrition will appear on each product page before that product becomes available for sale. Please do not rely on concept imagery or flavour names for dietary information.' },
  { question: 'What are the pack sizes?', answer: 'Pack sizes and weights are being confirmed. The preview uses illustrative variant names without claiming a finished size.' },
  { question: 'How does a mixed box work?', answer: 'Choose six bags from the flavour family. In live commerce, each selected bag becomes a real inventory-tracked Shopify order line, grouped with a box reference for fulfilment. Prices are the sum of the component prices unless an approved Shopify discount applies.' },
  { question: 'Where do you deliver?', answer: settings.delivery },
  { question: 'Can I enquire about gifts or bulk orders?', answer: 'Yes. Use the gift enquiry form to share your requirements. Submission is available when the merchant connects a real form destination; otherwise the preview clearly explains that delivery is not yet connected.' },
];

export type PolicyKey = 'shipping' | 'returns' | 'privacy' | 'terms';
export const policies: Record<PolicyKey, { title: string; status: string; paragraphs: string[] }> = {
  shipping: { title: 'Shipping', status: 'Draft · merchant approval required', paragraphs: [settings.delivery, 'Dispatch times, delivery areas, carriers, shipping rates and any free-delivery threshold must be confirmed by the merchant before launch. No preview shipping estimate is a delivery commitment.', 'For live orders, the checkout will show available delivery destinations and prices before payment.'] },
  returns: { title: 'Returns & refunds', status: 'Draft · merchant approval required', paragraphs: ['The merchant must confirm a returns and refunds process suitable for the actual products, including how customers report damaged or incorrect goods.', 'No payment is accepted in this preview. For future purchases, the approved policy and contact details will appear here before launch.', 'This draft does not remove rights that customers may have under applicable consumer law.'] },
  privacy: { title: 'Privacy', status: 'Draft · business details required', paragraphs: ['This preview stores a demonstration basket in your browser. If live commerce is configured, a secure session cookie connects your basket to Shopify. Shopify handles checkout, payments and customer accounts.', 'Enquiry and newsletter forms collect only the information you submit and transmit it to the merchant’s configured form destination when connected. We do not claim that an unconnected form has delivered your information.', 'Before launch, the merchant must name the operating business, privacy contact, processors, purposes, retention periods, applicable rights and any international transfers. Analytics consent must be configured where required.'] },
  terms: { title: 'Terms', status: 'Draft · merchant and legal review required', paragraphs: ['buttersalt currently displays provisional flavour concepts, concept visualisations and illustrative prices. They are not an offer to sell confirmed manufactured products.', 'Live purchases will be made through the merchant’s secure Shopify checkout once the range, prices, policies, delivery and merchant services are approved.', 'The legal business name, address, contact information and final purchase terms must be supplied and reviewed before public launch.'] },
};
