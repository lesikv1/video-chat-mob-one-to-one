
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
  Button
} from 'react-native';

export default function App2() {
  const a = useRef(null);
  const b = useRef([]);
  const c = useRef(null);

  const onSet = () => {
    a.current = {
      onLesik: () => {
        console.log('call func onLesik')
      }
    }
    b.current.push({
      name: 'asdd',
      age: 23
    })
    c.current = 'leiks kk k';
  }

  const onGet = () => {
    a.current.onLesik();
    console.log('a = ', a.current)
    console.log('b = ', b.current)
    console.log('c = ', c.current)
  }

  return (
    <View style={styles.root}>
      <Text>LESIKK K K</Text>
      <Button
        onPress={onSet}
        title="Set"
      />
      <Button
        onPress={onGet}
        title="Get"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
})
