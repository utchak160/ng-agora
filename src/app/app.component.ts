import {Component, OnInit} from '@angular/core';
import {AgoraClient, ClientEvent, NgxAgoraService, Stream, StreamEvent} from 'ngx-agora';
import {OneSignalService} from 'ngx-onesignal';
import {SwPush, SwUpdate} from '@angular/service-worker';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  readonly VAPID_PUBLIC_KEY = 'BIY_rijmGcrCNFyP2Wqhruwwy5YAKJHVcUMWopkyWMMX5NvpIuRbA8CRW754kdjJPocnbxgEB_QqHwgO3GqDNTA';

  audioStatus: boolean;
  videoStatus: boolean;
  callStatus: boolean;
  waitingStatus: boolean;
  title = 'ng-agora';
  localCallId = 'agora_local';
  remoteCalls: string[] = [];

  private client: AgoraClient;
  private localStream: Stream;
  private uid: number;

  constructor(private ngxAgoraService: NgxAgoraService,
              private oneSignal: OneSignalService,
              private update: SwUpdate,
              private sw: SwPush,
  ) {
    this.uid = Math.floor(Math.random() * 100);
    // (window as any).ngxOnesignal = oneSignal;
  }

  ngOnInit() {
    this.update.available.subscribe((event) => {
      console.log('current', event.current);
      console.log('available', event.available);
    });
    console.log(this.oneSignal.isInitialized, this.oneSignal.isSubscribe);
    this.client = this.ngxAgoraService.createClient({mode: 'rtc', codec: 'vp8'});
    this.assignClientHandlers();
    this.callStatus = true;
    this.waitingStatus = true;

    // Added in this step to initialize the local A/V stream
    this.localStream = this.ngxAgoraService.createStream({streamID: this.uid, audio: true, video: true, screen: false});
    this.localStream.setVideoProfile('1080p_5');
    this.assignLocalStreamHandlers();
    // Join and publish methods added in this step
    this.initLocalStream(() => this.join(uid => this.publish(), error => console.error(error)));
  }

  join(onSuccess?: (uid: number | string) => void, onFailure?: (error: Error) => void): void {
    this.client.join(null, 'foo-bar', this.uid, onSuccess, onFailure);
    this.waitingStatus = false;
  }

  /**
   * Attempts to upload the created local A/V stream to a joined chat room.
   */
  publish(): void {
    this.client.publish(this.localStream, err => console.log('Publish local stream error: ' + err));
  }

  private assignLocalStreamHandlers(): void {
    this.localStream.on(StreamEvent.MediaAccessAllowed, () => {
      console.log('accessAllowed');
      this.audioStatus = true;
      this.videoStatus = true;
    });

    // The user has denied access to the camera and mic.
    this.localStream.on(StreamEvent.MediaAccessDenied, () => {
      console.log('accessDenied');
    });
  }

  private initLocalStream(onSuccess?: () => any): void {
    this.localStream.init(
      () => {
        // The user has granted access to the camera and mic.
        this.localStream.play(this.localCallId);
        if (onSuccess) {
          onSuccess();
        }
      },
      err => console.error('getUserMedia failed', err)
    );
  }

  private assignClientHandlers(): void {
    this.client.on(ClientEvent.LocalStreamPublished, evt => {
      console.log('Publish local stream successfully');
    });

    this.client.on(ClientEvent.Error, error => {
      console.log('Got error msg:', error.reason);
      if (error.reason === 'DYNAMIC_KEY_TIMEOUT') {
        this.client.renewChannelKey(
          '',
          () => console.log('Renewed the channel key successfully.'),
          renewError => console.error('Renew channel key failed: ', renewError)
        );
      }
    });

    this.client.on(ClientEvent.RemoteStreamAdded, evt => {
      const stream = evt.stream as Stream;
      this.client.subscribe(stream, {audio: true, video: true}, err => {
        console.log('Subscribe stream failed', err);
      });
    });

    this.client.on(ClientEvent.RemoteStreamSubscribed, evt => {
      const stream = evt.stream as Stream;
      const id = this.getRemoteId(stream);
      if (!this.remoteCalls.length) {
        this.remoteCalls.push(id);
        setTimeout(() => stream.play(id), 1000);
      }
    });

    this.client.on(ClientEvent.RemoteStreamRemoved, evt => {
      const stream = evt.stream as Stream;
      if (stream) {
        stream.stop();
        this.remoteCalls = [];
        console.log(`Remote stream is removed ${stream.getId()}`);
      }
    });

    this.client.on(ClientEvent.PeerLeave, evt => {
      const stream = evt.stream as Stream;
      if (stream) {
        stream.stop();
        this.remoteCalls = this.remoteCalls.filter(call => call !== `${this.getRemoteId(stream)}`);
        console.log(`${evt.uid} left from this channel`);
      }
    });
  }

  private getRemoteId(stream: Stream): string {
    return `agora_remote-${stream.getId()}`;
  }

  pressMic() {
    if (this.audioStatus) {
      this.localStream.muteAudio();
      this.audioStatus = false;
    } else {
      this.localStream.unmuteAudio();
      this.audioStatus = true;
    }
  }

  pressVideo() {
    if (this.videoStatus) {
      this.localStream.muteVideo();
      this.videoStatus = false;
    } else {
      this.localStream.unmuteVideo();
      this.videoStatus = true;
    }
  }

  endCall() {
    this.sw.unsubscribe().then(r => console.log(r));
    this.client.leave();
    this.localStream.close();
    this.callStatus = false;
    this.waitingStatus = true;
  }

  subscribe() {
    this.oneSignal.subscribe();
    this.oneSignal.push([undefined]).then(r => console.log(r));
    console.log(this.oneSignal.isInitialized, this.oneSignal.isOptedOut, this.oneSignal.isSubscribe, this.oneSignal.isSupported);
    this.sw.requestSubscription({
      serverPublicKey: this.VAPID_PUBLIC_KEY
    }).then(value => console.log(value))
      .catch(err => console.log('Could not subscribe', err));
    console.log(this.sw.isEnabled, this.sw.messages, this.sw.subscription, this.sw.notificationClicks);
  }
}
