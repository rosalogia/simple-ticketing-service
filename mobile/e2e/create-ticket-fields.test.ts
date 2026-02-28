import {by, device, element, expect, waitFor} from 'detox';
import {loginAs} from './helpers/login';
import {goToHousematesQueue} from './helpers/navigation';

async function navigateToCreateTicket() {
  await element(by.id('new-ticket-fab')).tap();
  await waitFor(element(by.id('title-input')))
    .toBeVisible()
    .withTimeout(5000);
}

async function scrollToSubmit() {
  await waitFor(element(by.id('submit-ticket-button')))
    .toBeVisible()
    .whileElement(by.id('create-ticket-scroll'))
    .scroll(200, 'down');
}

describe('Create Ticket - Date Picker & CTI Autocomplete', () => {
  beforeAll(async () => {
    await device.launchApp({newInstance: true});
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await loginAs('alice');
    await goToHousematesQueue();
    await navigateToCreateTicket();
  });

  describe('Due Date Calendar Picker', () => {
    it('shows a date picker button instead of a text input', async () => {
      await element(by.id('create-ticket-scroll')).scrollTo('bottom');
      await expect(element(by.id('due-date-picker-button'))).toBeVisible();
      await expect(element(by.text('Select date...'))).toBeVisible();
    });

    it('opens date picker and cancel preserves placeholder', async () => {
      await element(by.id('create-ticket-scroll')).scrollTo('bottom');
      await element(by.id('due-date-picker-button')).tap();
      await waitFor(element(by.text('OK')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.text('Cancel')).tap();
      await waitFor(element(by.id('due-date-picker-button')))
        .toBeVisible()
        .withTimeout(3000);
      await expect(element(by.text('Select date...'))).toBeVisible();
    });

    it('selects a date and shows it on the button', async () => {
      await element(by.id('create-ticket-scroll')).scrollTo('bottom');
      await element(by.id('due-date-picker-button')).tap();
      await waitFor(element(by.text('OK')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.text('OK')).tap();
      await waitFor(element(by.text('Select date...')))
        .not.toBeVisible()
        .withTimeout(3000);
      await expect(element(by.text('Clear date'))).toBeVisible();
    });

    it('creates a ticket with a due date', async () => {
      const uniqueTitle = `DatePicker-${Date.now()}`;
      await element(by.id('title-input')).typeText(uniqueTitle);
      await element(by.id('title-input')).tapReturnKey();
      await scrollToSubmit();
      await element(by.id('due-date-picker-button')).tap();
      await waitFor(element(by.text('OK')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.text('OK')).tap();

      await scrollToSubmit();
      await element(by.id('submit-ticket-button')).tap();

      await waitFor(element(by.id('tab-to-me')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('CTI Autocomplete', () => {
    it('shows CTI text inputs instead of modal pickers', async () => {
      await element(by.id('create-ticket-scroll')).scrollTo('bottom');
      await waitFor(element(by.id('category-input')))
        .toBeVisible()
        .withTimeout(5000);
      await waitFor(element(by.id('type-input')))
        .toBeVisible()
        .withTimeout(5000);
      await waitFor(element(by.id('item-input')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('shows suggestions when category field is focused', async () => {
      await element(by.id('create-ticket-scroll')).scrollTo('bottom');
      await element(by.id('category-input')).tap();
      await waitFor(element(by.id('category-suggestions')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('filters category suggestions as user types', async () => {
      await element(by.id('create-ticket-scroll')).scrollTo('bottom');
      await element(by.id('category-input')).typeText('Soc');
      await waitFor(element(by.id('category-suggestion-Social')))
        .toExist()
        .withTimeout(5000);
    });

    it('selects a category from suggestions and fills input', async () => {
      await element(by.id('create-ticket-scroll')).scrollTo('bottom');
      // Type to filter first so the suggestion list is short
      await element(by.id('category-input')).typeText('Hom');
      await waitFor(element(by.id('category-suggestion-Home')))
        .toExist()
        .withTimeout(5000);
      // Dismiss keyboard so the suggestion is tappable without input stealing focus
      await element(by.id('category-input')).tapReturnKey();
      await waitFor(element(by.id('category-suggestion-Home')))
        .toBeVisible()
        .withTimeout(3000);
      await element(by.id('category-suggestion-Home')).tap();
      await expect(element(by.id('category-input'))).toHaveText('Home');
    });

    it('creates a ticket with category selected from autocomplete', async () => {
      const uniqueTitle = `CTI-Auto-${Date.now()}`;
      await element(by.id('title-input')).typeText(uniqueTitle);
      await element(by.id('title-input')).tapReturnKey();
      await scrollToSubmit();

      // Select category from autocomplete suggestion
      await element(by.id('category-input')).typeText('Soc');
      await element(by.id('category-input')).tapReturnKey();
      await waitFor(element(by.id('category-suggestion-Social')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('category-suggestion-Social')).tap();

      await expect(element(by.id('category-input'))).toHaveText('Social');

      await scrollToSubmit();
      await element(by.id('submit-ticket-button')).tap();

      await waitFor(element(by.id('tab-to-me')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('allows typing custom CTI values', async () => {
      const uniqueTitle = `CTI-Custom-${Date.now()}`;
      await element(by.id('title-input')).typeText(uniqueTitle);
      await element(by.id('title-input')).tapReturnKey();
      await scrollToSubmit();

      await element(by.id('category-input')).typeText('MyCustomCat');
      await element(by.id('category-input')).tapReturnKey();

      await scrollToSubmit();
      await element(by.id('submit-ticket-button')).tap();

      await waitFor(element(by.id('tab-to-me')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });
});
