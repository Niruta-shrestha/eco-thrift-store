import { PrismaClient, UserRole, PaymentMethod, PaymentsStatus, InteractionType,Prisma } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

const hashPassword = (password: string): string => {
    const hash = bcrypt.hashSync(password, 10);
    return hash
}


const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // --- Create Categories ---
  const categoryNames = [
    'Electronics',
    'Clothing',
    'Books',
    'Sports',
    'Toys',
    'Home & Kitchen',
    'Beauty',
    'Jewelry',
    'Shoes',
    'Gaming'
  ];

  const categories = await Promise.all(
    categoryNames.map(name => prisma.category.create({ data: { name } }))
  );

  // --- Create Users ---
  // Create a test user with known credentials
  const testUser = await prisma.user.create({
    data: {
      firstName: 'Test',
      lastName: 'User',
      email: 'test2@example.com',
      password: hashPassword('testpassword'),
      phone: '1234567890',
      address: 'Test Address',
      role: UserRole.USER
    }
  });

  console.log('Test user created: email=test2@example.com, password=testpassword');

  const users = await Promise.all(
    Array.from({ length: 19 }).map(() =>  // Reduced to 19 to account for the test user
      prisma.user.create({
        data: {
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
          password: faker.internet.password(),
          phone: faker.phone.number(),
          address: faker.location.streetAddress(),
          role: UserRole.USER
        }
      })
    )
  );

  users.unshift(testUser); // Add test user to the beginning

  // --- Create Products ---
  const products = await Promise.all(
    Array.from({ length: 50 }).map(() => {
      const seller = faker.helpers.arrayElement(users);
      const productCategories = faker.helpers.arrayElements(categories, faker.number.int({ min: 1, max: 3 }));

      return prisma.product.create({
        data: {
          name: faker.commerce.productName(),
          description: faker.commerce.productDescription(),
          price: new Prisma.Decimal(faker.commerce.price({ min: 10, max: 500, dec: 2 })),
          image: faker.image.url(),
          userId: seller.id,
          categories: {
            connect: productCategories.map(c => ({ id: c.id }))
          }
        }
      });
    })
  );

  // --- Create Orders, OrderItems, and Payments ---
for (let i = 0; i < 30; i++) {
  const buyer = faker.helpers.arrayElement(users);
  const orderProducts = faker.helpers.arrayElements(products, faker.number.int({ min: 1, max: 5 }));

  const orderItemsData = orderProducts.map(prod => ({
    productId: prod.id,
    quantity: faker.number.int({ min: 1, max: 3 }),
    unitPrice: prod.price
  }));

  const totalAmount = orderItemsData.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0
  );

  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
      destination: faker.location.streetAddress(),
      orderItems: {
        create: orderItemsData
      },
      Payments: {
        create: {
          amount: new Prisma.Decimal(totalAmount.toFixed(2)),
          paymentMethod: faker.helpers.arrayElement(Object.values(PaymentMethod)),
          status: faker.helpers.arrayElement(Object.values(PaymentsStatus)),
          transactionId: `TXN-${faker.string.alphanumeric(12).toUpperCase()}` // ✅ unique transactionId
        }
      }
    }
  });

  // --- Track UserInteractedCategory ---
  for (const prod of orderProducts) {
    const prodCategories = await prisma.product.findUnique({
      where: { id: prod.id },
      include: { categories: true }
    });

    if (prodCategories) {
      for (const cat of prodCategories.categories) {
        await prisma.userInteractedCategory.upsert({
          where: {
            userId_categoryId_interactionType: {
              userId: buyer.id,
              categoryId: cat.id,
              interactionType: InteractionType.PURCHASE
            }
          },
          update: {
            interactionCount: { increment: 1 },
            lastInteractedAt: new Date()
          },
          create: {
            userId: buyer.id,
            categoryId: cat.id,
            interactionType: InteractionType.PURCHASE
          }
        });
      }
    }
  }
}


  // --- Add random views and cart interactions ---
  for (const user of users) {
    const randomProducts = faker.helpers.arrayElements(products, 10);
    for (const prod of randomProducts) {
      const prodCategories = await prisma.product.findUnique({
        where: { id: prod.id },
        include: { categories: true }
      });

      if (prodCategories) {
        for (const cat of prodCategories.categories) {
          const type = faker.helpers.arrayElement([InteractionType.VIEW, InteractionType.CART]);

          await prisma.userInteractedCategory.upsert({
            where: {
              userId_categoryId_interactionType: {
                userId: user.id,
                categoryId: cat.id,
                interactionType: type
              }
            },
            update: {
              interactionCount: { increment: 1 },
              lastInteractedAt: new Date()
            },
            create: {
              userId: user.id,
              categoryId: cat.id,
              interactionType: type
            }
          });
        }
      }
    }
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
