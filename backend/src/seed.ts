import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo users
  const hashedPassword = await bcrypt.hash('demo123', 10);

  const artisan = await prisma.user.upsert({
    where: { email: 'artisan@demo.com' },
    update: {},
    create: {
      name: 'Priya Sharma',
      email: 'artisan@demo.com',
      password: hashedPassword,
      phone: '+91-9876543210',
      role: 'ARTISAN',
      preferredLanguage: 'en',
      location: 'Jaipur, Rajasthan',
      craftType: 'Textile Weaving',
      bio: 'Traditional textile weaver with 15 years of experience. Specialized in hand-woven sarees and shawls.',
      isApproved: true,
    },
  });

  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@demo.com' },
    update: {},
    create: {
      name: 'Rajesh Kumar',
      email: 'buyer@demo.com',
      password: hashedPassword,
      phone: '+91-9876543211',
      role: 'BUYER',
      preferredLanguage: 'en',
      location: 'Mumbai, Maharashtra',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@demo.com',
      password: hashedPassword,
      role: 'ADMIN',
      preferredLanguage: 'en',
    },
  });

  console.log('✅ Created demo users');

  // Create sample products
  const products = [
    {
      title: 'Handwoven Silk Saree - Traditional Banarasi',
      description: 'Beautiful handwoven Banarasi silk saree with intricate gold zari work. Made using traditional techniques passed down through generations.',
      hindiDescription: 'सुंदर हाथ से बुनी बनारसी रेशम साड़ी, जटिल सोने की ज़री के काम के साथ। पीढ़ियों से चली आ रही पारंपरिक तकनीकों का उपयोग करके बनाई गई।',
      englishDescription: 'Beautiful handwoven Banarasi silk saree with intricate gold zari work. Made using traditional techniques passed down through generations.',
      category: 'Textiles & Clothing',
      material: 'Pure Silk',
      dimensions: '6.5 meters length, 1.2 meters width',
      quantity: 5,
      rawMaterialCost: 3000,
      labourCost: 2000,
      packagingCost: 200,
      otherCost: 300,
      minimumPrice: 6325,
      suggestedPrice: 7150,
      premiumPrice: 8250,
      keywords: 'saree, silk, banarasi, handwoven, traditional, zari work, ethnic wear',
      status: 'APPROVED',
    },
    {
      title: 'Terracotta Decorative Vase - Hand Painted',
      description: 'Authentic terracotta vase with traditional hand-painted designs. Perfect for home decoration or gifting.',
      hindiDescription: 'पारंपरिक हाथ से चित्रित डिजाइनों के साथ प्रामाणिक टेराकोटा फूलदान। घर की सजावट या उपहार देने के लिए एकदम सही।',
      englishDescription: 'Authentic terracotta vase with traditional hand-painted designs. Perfect for home decoration or gifting.',
      category: 'Pottery & Ceramics',
      material: 'Terracotta Clay',
      dimensions: '25cm height, 15cm diameter',
      quantity: 10,
      rawMaterialCost: 150,
      labourCost: 350,
      packagingCost: 100,
      otherCost: 50,
      minimumPrice: 759.5,
      suggestedPrice: 858,
      premiumPrice: 990,
      keywords: 'terracotta, vase, hand-painted, pottery, home decor, traditional',
      status: 'APPROVED',
    },
    {
      title: 'Bamboo Basket Set - Eco-Friendly Storage',
      description: 'Set of 3 handwoven bamboo baskets. Eco-friendly, sustainable, and perfect for storage or decoration.',
      hindiDescription: 'हाथ से बुने 3 बांस की टोकरियों का सेट। पर्यावरण के अनुकूल, टिकाऊ, और भंडारण या सजावट के लिए एकदम सही।',
      englishDescription: 'Set of 3 handwoven bamboo baskets. Eco-friendly, sustainable, and perfect for storage or decoration.',
      category: 'Bamboo & Cane',
      material: 'Natural Bamboo',
      dimensions: 'Small: 20cm, Medium: 25cm, Large: 30cm',
      quantity: 8,
      rawMaterialCost: 200,
      labourCost: 400,
      packagingCost: 150,
      otherCost: 50,
      minimumPrice: 920,
      suggestedPrice: 1040,
      premiumPrice: 1200,
      keywords: 'bamboo, basket, eco-friendly, sustainable, handwoven, storage',
      status: 'APPROVED',
    },
    {
      title: 'Brass Diya Set - Traditional Oil Lamps',
      description: 'Hand-crafted brass diyas (oil lamps) set of 6. Traditional design with intricate engravings. Perfect for festivals and daily worship.',
      hindiDescription: 'हाथ से बनाए गए पीतल के दीये (तेल के दीपक) 6 का सेट। जटिल उत्कीर्णन के साथ पारंपरिक डिजाइन। त्योहारों और दैनिक पूजा के लिए एकदम सही।',
      englishDescription: 'Hand-crafted brass diyas (oil lamps) set of 6. Traditional design with intricate engravings. Perfect for festivals and daily worship.',
      category: 'Metalwork',
      material: 'Brass',
      dimensions: '8cm diameter each',
      quantity: 15,
      rawMaterialCost: 300,
      labourCost: 200,
      packagingCost: 80,
      otherCost: 20,
      minimumPrice: 690,
      suggestedPrice: 780,
      premiumPrice: 900,
      keywords: 'brass, diya, oil lamp, traditional, festival, puja, handcrafted',
      status: 'APPROVED',
    },
    {
      title: 'Organic Cotton Handloom Bedsheet',
      description: 'Soft and breathable organic cotton bedsheet with traditional block print designs. Hand-woven and naturally dyed. Double bed size.',
      hindiDescription: 'पारंपरिक ब्लॉक प्रिंट डिजाइन के साथ नरम और सांस लेने योग्य जैविक कपास की चादर। हाथ से बुना और प्राकृतिक रूप से रंगा हुआ।',
      englishDescription: 'Soft and breathable organic cotton bedsheet with traditional block print designs. Hand-woven and naturally dyed. Double bed size.',
      category: 'Textiles & Clothing',
      material: 'Organic Cotton',
      dimensions: '230cm x 250cm (Double bed)',
      quantity: 12,
      rawMaterialCost: 400,
      labourCost: 300,
      packagingCost: 100,
      otherCost: 50,
      minimumPrice: 977.5,
      suggestedPrice: 1105,
      premiumPrice: 1275,
      keywords: 'cotton, bedsheet, handloom, organic, block print, natural dye',
      status: 'APPROVED',
    },
    {
      title: 'Wooden Jewelry Box - Hand Carved',
      description: 'Beautiful hand-carved wooden jewelry box with traditional motifs. Intricate floral patterns and velvet interior lining. Perfect for storing jewelry safely.',
      hindiDescription: 'पारंपरिक आकृतियों के साथ सुंदर हाथ से उकेरा हुआ लकड़ी का गहना बॉक्स। जटिल फूलों के पैटर्न और मखमली आंतरिक परत।',
      englishDescription: 'Beautiful hand-carved wooden jewelry box with traditional motifs. Intricate floral patterns and velvet interior lining. Perfect for storing jewelry safely.',
      category: 'Woodwork',
      material: 'Sheesham Wood',
      dimensions: '20cm x 15cm x 8cm',
      quantity: 7,
      rawMaterialCost: 250,
      labourCost: 450,
      packagingCost: 100,
      otherCost: 50,
      minimumPrice: 977.5,
      suggestedPrice: 1105,
      premiumPrice: 1275,
      keywords: 'wood, jewelry box, hand carved, storage, traditional, sheesham',
      status: 'APPROVED',
    },
  ];

  for (const productData of products) {
    // Idempotent: re-running `npm run db:seed` refreshes the sample listings
    // instead of inserting duplicates (Product.title has no unique constraint).
    // Duplicate rows created by older non-idempotent runs are collapsed to one.
    const existing = await prisma.product.findMany({
      where: { artisanId: artisan.id, title: productData.title },
      orderBy: { createdAt: 'asc' },
    });

    if (existing.length > 0) {
      await prisma.product.update({
        where: { id: existing[0].id },
        data: productData,
      });

      for (const dup of existing.slice(1)) {
        await prisma.enquiry.deleteMany({ where: { productId: dup.id } });
        await prisma.product.delete({ where: { id: dup.id } });
      }
    } else {
      await prisma.product.create({
        data: {
          ...productData,
          artisanId: artisan.id,
        },
      });
    }
  }

  console.log(`✅ Sample products ready (${products.length})`);

  // Create the sample enquiry only once
  const existingEnquiry = await prisma.enquiry.findFirst({
    where: { buyerId: buyer.id },
  });

  if (existingEnquiry) {
    console.log('ℹ️  Sample enquiry already present - skipped');
  } else {
    const [firstProduct] = await prisma.product.findMany({
      orderBy: { createdAt: 'asc' },
      take: 1,
    });

    if (firstProduct) {
      await prisma.enquiry.create({
        data: {
          productId: firstProduct.id,
          buyerId: buyer.id,
          quantity: 2,
          message: 'Hi, I am interested in purchasing this saree. Can you provide more details about the color options available?',
          status: 'PENDING',
        },
      });

      console.log('✅ Created sample enquiry');
    }
  }

  console.log('🎉 Database seeded successfully!');
  console.log('\n📝 Demo Accounts:');
  console.log('Artisan: artisan@demo.com / demo123');
  console.log('Buyer: buyer@demo.com / demo123');
  console.log('Admin: admin@demo.com / demo123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
