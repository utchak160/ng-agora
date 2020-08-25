import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { environment } from 'src/environments/environment';
import {AgoraConfig, NgxAgoraModule} from 'ngx-agora';
import {MatButtonModule, MatIconModule} from '@angular/material';
import { ServiceWorkerModule } from '@angular/service-worker';
import { NgxOneSignalModule } from 'ngx-onesignal';


const agoraConfig: AgoraConfig = {
  AppID: '6fce895ed6694f50940e5f84275024b9',
};

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    NgxAgoraModule.forRoot(agoraConfig),
    MatButtonModule,
    MatIconModule,
    ServiceWorkerModule.register('OneSignalSDKWorker.js', { enabled: environment.production }),
    NgxOneSignalModule.forRoot({
      appId: 'f37286ea-8d93-4952-9f5e-6750ff5b5a63',
      allowLocalhostAsSecureOrigin: true,
      autoRegister: false,
      notifyButton: {
        enabled: false
      },
      promptOptions: {
        showCredit: false
      },
    }),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
