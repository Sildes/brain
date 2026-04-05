import { describe, it, expect } from 'vitest';
import { discoverTopics, mergeOverlappingTopics } from '../src/discover.js';
import type { BrainData, Topic } from '../src/types.js';
import { TopicStatus } from '../src/types.js';

function makeBrainData(overrides: Partial<BrainData> = {}): BrainData {
  return {
    framework: 'generic',
    modules: [],
    routes: [],
    commands: [],
    conventions: { standards: [], notes: [], navigation: [] },
    keyFiles: [],
    quickFind: [],
    fileCount: 0,
    ...overrides,
  };
}

describe('discoverTopics', () => {
  it('returns general topic when no significant terms', () => {
    const data = makeBrainData();
    const files = ['src/a.ts', 'src/b.ts', 'src/c.ts'];
    const topics = discoverTopics(data, files);

    expect(topics).toHaveLength(1);
    expect(topics[0].name).toBe('general');
    expect(topics[0].files).toEqual(files);
    expect(topics[0].status).toBe(TopicStatus.New);
  });

  it('discovers topics from routes', () => {
    const data = makeBrainData({
      routes: [
        { name: 'api_booking_list', path: '/api/booking/list', methods: ['GET'], controller: 'BookingController' },
        { name: 'api_booking_create', path: '/api/booking/create', methods: ['POST'], controller: 'BookingController' },
        { name: 'api_payment_process', path: '/api/payment/process', methods: ['POST'], controller: 'PaymentController' },
        { name: 'api_payment_refund', path: '/api/payment/refund', methods: ['POST'], controller: 'PaymentController' },
      ],
    });
    const files = [
      'src/Booking/BookingService.php',
      'src/Booking/BookingController.php',
      'src/Booking/BookingRepository.php',
      'src/Payment/PaymentService.php',
      'src/Payment/PaymentController.php',
      'src/Payment/PaymentRepository.php',
    ];
    for (let i = 0; i < 20; i++) {
      files.push(`src/Other/OtherFile${i}.ts`);
    }
    const topics = discoverTopics(data, files);
    const names = topics.map((t) => t.name);

    expect(names).toContain('booking');
    expect(names).toContain('payment');
  });

  it('filters generic terms', () => {
    const data = makeBrainData({
      routes: [
        { name: 'list', path: '/list', methods: ['GET'] },
        { name: 'show', path: '/show', methods: ['GET'] },
      ],
    });
    const files = [
      'src/list/handler.ts',
      'src/show/handler.ts',
      'src/list/service.ts',
      'src/show/service.ts',
    ];
    const topics = discoverTopics(data, files);

    for (const topic of topics) {
      expect(topic.name).not.toBe('list');
      expect(topic.name).not.toBe('show');
    }
  });

  it('splits oversized clusters', () => {
    const routes: BrainData['routes'] = [];
    const files: string[] = [];
    const domainTerms = [
      'billing', 'shipping', 'returns', 'warehousing', 'catalog',
      'inventory', 'procurement', 'logistics', 'taxation', 'compliance',
      'reporting', 'analytics', 'forecasting', 'merchandising', 'promotion',
      'pricing', 'discount', 'loyalty', 'referral', 'affiliate',
    ];

    for (const term of domainTerms) {
      for (let i = 0; i < 3; i++) {
        files.push(`src/${term}/${term}_${i}.ts`);
      }
      routes.push({
        name: `api_${term}`,
        path: `/api/${term}`,
        methods: ['GET'],
      });
      routes.push({
        name: `api_${term}_detail`,
        path: `/api/${term}/detail`,
        methods: ['GET'],
      });
    }

    const data = makeBrainData({ routes });
    const topics = discoverTopics(data, files);

    expect(topics.length).toBeGreaterThan(1);
  });

  it('scales co-occurrence threshold with larger file sets', () => {
    const routes = [
      { name: 'api_booking_list', path: '/api/booking/list', methods: ['GET'], controller: 'BookingController' },
      { name: 'api_booking_create', path: '/api/booking/create', methods: ['POST'], controller: 'BookingController' },
      { name: 'api_payment_process', path: '/api/payment/process', methods: ['POST'], controller: 'PaymentController' },
      { name: 'api_payment_refund', path: '/api/payment/refund', methods: ['POST'], controller: 'PaymentController' },
    ];

    const smallFiles = [
      'src/Booking/BookingService.php',
      'src/Booking/BookingController.php',
      'src/Payment/PaymentService.php',
      'src/Payment/PaymentController.php',
    ];
    for (let i = 0; i < 20; i++) {
      smallFiles.push(`src/Other/OtherFile${i}.ts`);
    }

    const largeFiles = [...smallFiles];
    for (let i = 0; i < 400; i++) {
      largeFiles.push(`src/Misc/MiscFile${i}.ts`);
    }

    const smallData = makeBrainData({ routes });
    const largeData = makeBrainData({ routes });

    const smallTopics = discoverTopics(smallData, smallFiles);
    const largeTopics = discoverTopics(largeData, largeFiles);

    const smallNonGeneral = smallTopics.filter((t) => t.name !== 'general').length;
    const largeNonGeneral = largeTopics.filter((t) => t.name !== 'general').length;

    if (smallNonGeneral > 0 && largeNonGeneral > 0) {
      expect(smallNonGeneral).toBeGreaterThanOrEqual(largeNonGeneral);
    }
  });
});

describe('mergeOverlappingTopics', () => {
  it('merges topics with high file overlap', () => {
    const sharedFiles = ['src/booking/service.ts', 'src/booking/controller.ts', 'src/booking/model.ts'];
    const topicA: Topic = {
      name: 'booking',
      keywords: ['booking', 'reservation'],
      files: [...sharedFiles, 'src/booking/extra_a.ts'],
      routes: [],
      commands: [],
      status: TopicStatus.New,
    };
    const topicB: Topic = {
      name: 'reservation',
      keywords: ['reservation', 'slot'],
      files: [...sharedFiles, 'src/booking/extra_b.ts'],
      routes: [],
      commands: [],
      status: TopicStatus.New,
    };

    const merged = mergeOverlappingTopics([topicA, topicB], 0.6);

    expect(merged.length).toBe(1);
    expect(merged[0].files).toContain('src/booking/service.ts');
    expect(merged[0].keywords).toContain('booking');
    expect(merged[0].keywords).toContain('reservation');
  });

  it('does not merge topics with low overlap', () => {
    const topicA: Topic = {
      name: 'booking',
      keywords: ['booking'],
      files: ['src/booking/a.ts', 'src/booking/b.ts', 'src/booking/c.ts'],
      routes: [],
      commands: [],
      status: TopicStatus.New,
    };
    const topicB: Topic = {
      name: 'payment',
      keywords: ['payment'],
      files: ['src/payment/x.ts', 'src/payment/y.ts', 'src/payment/z.ts'],
      routes: [],
      commands: [],
      status: TopicStatus.New,
    };

    const merged = mergeOverlappingTopics([topicA, topicB], 0.6);

    expect(merged).toHaveLength(2);
  });

  it('returns single topic unchanged', () => {
    const topic: Topic = {
      name: 'solo',
      keywords: ['solo'],
      files: ['src/solo.ts'],
      routes: [],
      commands: [],
      status: TopicStatus.New,
    };

    const result = mergeOverlappingTopics([topic]);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('solo');
  });

  it('returns empty array unchanged', () => {
    const result = mergeOverlappingTopics([]);

    expect(result).toHaveLength(0);
  });
});
