import { TestBed } from '@angular/core/testing';

import { PrivateChatService } from './private-chat.service';

describe('PrivateChatService', () => {
  let service: PrivateChatService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrivateChatService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
