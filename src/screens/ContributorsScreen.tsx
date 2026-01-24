import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useBackground } from '../providers/BackgroundProvider';

interface Contributor {
  name: string;
  role: string;
  avatar?: string;
  description: string;
  links?: {
    github?: string;
    twitter?: string;
    website?: string;
  };
}

const CONTRIBUTORS: Contributor[] = [
  {
    name: 'فريق التطوير',
    role: 'المطورون',
    description: 'فريق مخصص لتطوير وتحسين التطبيق',
    links: {
      github: 'https://github.com',
    },
  },
  {
    name: 'فريق التصميم',
    role: 'المصممون',
    description: 'فريق متخصص في تصميم واجهات المستخدم',
  },
  {
    name: 'فريق الدعم',
    role: 'دعم المستخدمين',
    description: 'فريق مكرس لمساعدة المستخدمين وحل المشاكل',
  },
];

const ContributorsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { selectedGradient } = useBackground();

  const handleOpenLink = (url?: string) => {
    if (url) {
      Linking.openURL(url).catch((err) => console.error('Error opening link:', err));
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={selectedGradient.colors} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-forward" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>لائحة الشكر</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Intro Section */}
            <View style={styles.introSection}>
              <Text style={styles.introTitle}>شكراً لك على دعمك</Text>
              <Text style={styles.introText}>
                هذا التطبيق تم تطويره بحب وجهد من قبل فريق متخصص يؤمن برسالة الامتنان والتقدير.
              </Text>
            </View>

            {/* Contributors List */}
            <View style={styles.contributorsSection}>
              <Text style={styles.sectionTitle}>المساهمون</Text>
              {CONTRIBUTORS.map((contributor, index) => (
                <View key={index} style={styles.contributorCard}>
                  {/* Avatar */}
                  <View style={styles.avatarContainer}>
                    <LinearGradient
                      colors={['#ea384c', '#9c3d1a']}
                      style={styles.avatarGradient}
                    >
                      <Text style={styles.avatarText}>
                        {contributor.name.charAt(0)}
                      </Text>
                    </LinearGradient>
                  </View>

                  {/* Info */}
                  <View style={styles.infoContainer}>
                    <Text style={styles.contributorName}>{contributor.name}</Text>
                    <Text style={styles.contributorRole}>{contributor.role}</Text>
                    <Text style={styles.contributorDescription}>
                      {contributor.description}
                    </Text>

                    {/* Links */}
                    {contributor.links && (
                      <View style={styles.linksContainer}>
                        {contributor.links.github && (
                          <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => handleOpenLink(contributor.links?.github)}
                          >
                            <Icon name="logo-github" size={18} color="#fff" />
                          </TouchableOpacity>
                        )}
                        {contributor.links.twitter && (
                          <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => handleOpenLink(contributor.links?.twitter)}
                          >
                            <Icon name="logo-twitter" size={18} color="#fff" />
                          </TouchableOpacity>
                        )}
                        {contributor.links.website && (
                          <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => handleOpenLink(contributor.links?.website)}
                          >
                            <Icon name="globe-outline" size={18} color="#fff" />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Special Thanks Section */}
            <View style={styles.thanksSection}>
              <Text style={styles.sectionTitle}>شكر خاص</Text>
              <View style={styles.thanksCard}>
                <Icon name="heart" size={32} color="#ea384c" />
                <Text style={styles.thanksText}>
                  شكراً لكل من ساهم في تطوير هذا التطبيق، سواء بالفكرة أو التطوير أو الدعم.
                </Text>
              </View>
            </View>

            {/* Contact Section */}
            <View style={styles.contactSection}>
              <Text style={styles.sectionTitle}>تواصل معنا</Text>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => handleOpenLink('mailto:support@example.com')}
              >
                <Icon name="mail-outline" size={20} color="#fff" />
                <Text style={styles.contactButtonText}>البريد الإلكتروني</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => handleOpenLink('https://twitter.com')}
              >
                <Icon name="logo-twitter" size={20} color="#fff" />
                <Text style={styles.contactButtonText}>تويتر</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  placeholder: { width: 40 },
  content: { flex: 1, padding: 20 },
  // Intro Section
  introSection: {
    marginBottom: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'right',
  },
  introText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
    textAlign: 'right',
  },
  // Contributors Section
  contributorsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'right',
  },
  contributorCard: {
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: 16,
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoContainer: {
    flex: 1,
  },
  contributorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'right',
  },
  contributorRole: {
    fontSize: 13,
    color: '#ea384c',
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'right',
  },
  contributorDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
    marginBottom: 10,
    textAlign: 'right',
  },
  linksContainer: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  linkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(234,56,76,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(234,56,76,0.4)',
  },
  // Thanks Section
  thanksSection: {
    marginBottom: 30,
  },
  thanksCard: {
    backgroundColor: 'rgba(234,56,76,0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(234,56,76,0.3)',
  },
  thanksText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  // Contact Section
  contactSection: {
    marginBottom: 40,
  },
  contactButton: {
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  contactButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginRight: 12,
  },
});

export default ContributorsScreen;
