
import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
  registerGlobals
} from 'react-native-webrtc';

import io from 'socket.io-client'

const dimensions = Dimensions.get('window')


export default function App() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const sdp = useRef(null);
  const socket = useRef(null);
  const candidates = useRef([]);

  const pc_config = {
    "iceServers": [
      {
        urls: 'stun:stun.l.google.com:19302'
      },
      // {
      //   urls: 'stun:stun2.l.google.com:19302'
      // },
      // {
      //   urls: 'stun:stun3.l.google.com:19302'
      // },
      // {
      //   urls: 'stun:stun4.l.google.com:19302'
      // },
    ]
  }

  const pc = useRef(new RTCPeerConnection(pc_config))

  const sendToPeer = (messageType, payload) => {
    socket.current.emit(messageType, {
      socketID: socket.current.id,
      payload
    })
  }

  const createOffer = () => {
    console.log('Offer')

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
    // initiates the creation of SDP
    pc.current.createOffer({ offerToReceiveVideo: 1 })
      .then(sdp => {
        // console.log(JSON.stringify(sdp))

        // set offer sdp as local description
        pc.current.setLocalDescription(sdp)

        sendToPeer('offerOrAnswer', sdp)
      })
  }

  const createAnswer = () => {
    console.log('Answer')
    pc.current.createAnswer({ offerToReceiveVideo: 1 })
      .then(sdp => {
        // console.log(JSON.stringify(sdp))

        // set answer sdp as local description
        pc.current.setLocalDescription(sdp)

        sendToPeer('offerOrAnswer', sdp)
      })
  }

  const addCandidate = () => {
    // retrieve and parse the Candidate copied from the remote peer
    // const candidate = JSON.parse(this.textref.value)
    // console.log('Adding candidate:', candidate)

    // add the candidate to the peer connection
    // this.pc.addIceCandidate(new RTCIceCandidate(candidate))

    candidates.current.forEach(candidate => {
      console.log(JSON.stringify(candidate))
      pc.current.addIceCandidate(new RTCIceCandidate(candidate))
    });
  }

  const setRemoteDescription = () => {
    // retrieve and parse the SDP copied from the remote peer
    const desc = JSON.parse(sdp.current)

    // set sdp as remote description
    pc.current.setRemoteDescription(new RTCSessionDescription(desc))
  }

  const success = (stream) => {
    console.log(stream.toURL())
    // this.setState({
    //   localStream: stream
    // })
    setLocalStream(stream)
    pc.current.addStream(stream)
  }

  const failure = (e) => {
    console.log('getUserMedia Error: ', e)
  }

  useEffect(() => {
    socket.current = io.connect(
      'https://5dbe70125ab7.ngrok.io/webrtcPeer',
      {
        path: '/io/webrtc',
        query: {}
      }
    )

    socket.current.on('connection-success', success => {
      console.log(success)
    })

    socket.current.on('offerOrAnswer', (sdp) => {
      console.log('From Peer...sdp offerOrAnswer', JSON.stringify(sdp))

      sdp.current = JSON.stringify(sdp)

      // set sdp as remote description
      pc.current.setRemoteDescription(new RTCSessionDescription(sdp))
    })

    socket.current.on('candidate', (candidate) => {
      console.log('From Peer... candidate', JSON.stringify(candidate))
      // candidates.current = [...candidates.current, candidate]
      pc.current.addIceCandidate(new RTCIceCandidate(candidate))
    })


    pc.current.onicecandidate = (e) => {
      // send the candidates to the remote peer
      // see addCandidate below to be triggered on the remote peer
      if (e.candidate) {
        console.log(JSON.stringify(e.candidate), 'onicecandidate -- ---')
        sendToPeer('candidate', e.candidate)
      }
    }

    pc.current.oniceconnectionstatechange = (e) => {
      console.log(e)
    }

    pc.current.onaddstream = (e) => {
      // debugger
      // this.remoteVideoref.current.srcObject = e.streams[0]
      // this.setState({
      //   remoteStream: e.stream
      // })
      console.log(JSON.stringify(e.stream), 'onaddstream --- ---')
      setRemoteStream(e.stream);
    }


    let isFront = true;
    console.log(1111);
    mediaDevices.enumerateDevices().then(sourceInfos => {
      console.log(sourceInfos);
      let videoSourceId;
      for (let i = 0; i < sourceInfos.length; i++) {
        const sourceInfo = sourceInfos[i];
        if(sourceInfo.kind == "videoinput" && sourceInfo.facing == (isFront ? "front" : "environment")) {
          videoSourceId = sourceInfo.deviceId;
        }
      }
      const constraints = {
        audio: true,
        video: {
          mandatory: {
            minWidth: 500, // Provide your own width, height and frame rate here
            minHeight: 300,
            minFrameRate: 30
          },
          facingMode: (isFront ? "user" : "environment"),
          optional: (videoSourceId ? [{sourceId: videoSourceId}] : [])
        }
      }

      mediaDevices.getUserMedia(constraints)
        .then(success)
        .catch(failure);
    });
  }, []);

  const remoteVideo = remoteStream ?
    (
      <RTCView
        key={2}
        mirror={true}
        style={{ ...styles.rtcViewRemote }}
        objectFit='contain'
        streamURL={remoteStream && remoteStream.toURL()}
      />
    ) :
    (
      <View style={{ padding: 15, }}>
        <Text style={{ fontSize:22, textAlign: 'center', color: 'white' }}>Waiting for Peer connection ...</Text>
      </View>
    )

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar backgroundColor="blue" barStyle={'dark-content'}/>
      <View style={styles.buttonsContainer}>
        <View style={{ flex: 1, }}>
          <TouchableOpacity onPress={createOffer}>
            <View style={styles.button}>
              <Text style={{ ...styles.textContent, }}>Call</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, }}>
          <TouchableOpacity onPress={createAnswer}>
            <View style={styles.button}>
              <Text style={{ ...styles.textContent, }}>Answer</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ ...styles.videosContainer, }}>
        <View style={{
          position: 'absolute',
          zIndex: 1,
          bottom: 10,
          right: 10,
          width: 100, height: 200,
          backgroundColor: 'black', //width: '100%', height: '100%'
        }}>
          <View style={{flex: 1 }}>
            <TouchableOpacity onPress={() => localStream?._tracks[1]._switchCamera()}>
              <View>
                <RTCView
                  key={1}
                  zOrder={0}
                  objectFit='cover'
                  style={{ ...styles.rtcView }}
                  streamURL={localStream && localStream.toURL()}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{
          position: 'relative',
          flex: 1,
          width: '100%',
          height: 300,
          backgroundColor: 'black',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          { remoteVideo }
        </View>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  buttonsContainer: {
    flexDirection: 'row',
    position: 'relative',
  },
  button: {
    margin: 5,
    paddingVertical: 10,
    backgroundColor: 'lightgrey',
    borderRadius: 5,
  },
  textContent: {
    fontFamily: 'Avenir',
    fontSize: 20,
    textAlign: 'center',
  },
  videosContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  rtcView: {
    width: 100, //dimensions.width,
    height: 200,//dimensions.height / 2,
    backgroundColor: 'black',
  },
  scrollView: {
    flex: 1,
    // flexDirection: 'row',
    backgroundColor: 'teal',
    padding: 15,
  },
  rtcViewRemote: {
    width: dimensions.width - 30,
    height: 200,//dimensions.height / 2,
    backgroundColor: 'black',
  }
});
