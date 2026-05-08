import { bootstrap,DefaultJobQueuePlugin } from '@vendure/core';
import { populate, populateInitialData } from '@vendure/core/cli';
// Point this to your actual production config
import { config } from './vendure-config'; 
import path from 'path';


config.apiOptions.port = 0;

const dummyInitialData = {
  defaultLanguage: 'th',
  defaultZone: 'CSV-Import-Zone', // Creates a harmless empty zone if it doesn't exist
  countries: [],
  taxRates: [],
  shippingMethods: [],
  paymentMethods: [],
  collections: [],
  roles: [],
};

const productsCsvFile = path.join(__dirname, '../products.csv');
const populateConfig = {
    ...config,
    plugins: (config.plugins || []).filter(plugin => plugin !== DefaultJobQueuePlugin,)
}

populate(
  () => bootstrap(populateConfig),
  dummyInitialData,
   productsCsvFile
)
  .then(app => app.close())
  .then(
    () => {
      console.log('✅ Successfully bulk imported product data');
      process.exit(0);
    },
    err => {
      console.error('❌ Error during import:', err);
      process.exit(1);
    }
  );