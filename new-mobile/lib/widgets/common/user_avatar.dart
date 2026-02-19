import 'dart:convert';
import 'package:flutter/material.dart';

class UserAvatar extends StatelessWidget {
  final Map<String, dynamic> user;
  const UserAvatar(this.user, {super.key});
  @override
  Widget build(BuildContext context) {
    final avatar = (user['avatar'] ?? '') as String;
    ImageProvider? img;
    if (avatar.startsWith('data:')) {
      try {
        final b64 = avatar.split(',').last;
        img = MemoryImage(base64Decode(b64));
      } catch (_) {}
    } else if (avatar.startsWith('http')) {
      img = NetworkImage(avatar);
    }
    return CircleAvatar(
      backgroundColor: const Color(0xFF2A2A2A),
      backgroundImage: img,
      child: img == null ? const Icon(Icons.person, color: Colors.white) : null,
    );
  }
}

